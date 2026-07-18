import { getSupabaseBrowser } from "@/lib/supabase/client";

const IMAGE_BUCKET = "listing-photos";

export type StorageImageKind = "listing" | "avatar";

type StorageError = { message: string };

export type ImageUploadClient = {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        file: File,
        options: { cacheControl: string; contentType: string; upsert: false },
      ): Promise<{ data: { path: string } | null; error: StorageError | null }>;
      getPublicUrl(path: string): { data: { publicUrl: string } };
    };
  };
};

export type ProfileAvatarClient = {
  from(table: "users"): {
    update(values: { avatar_url: string }): {
      eq(column: "id", value: string): Promise<{ error: StorageError | null }>;
    };
  };
};

export type StorageUploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

const UPLOAD_FAILURE: StorageUploadResult = {
  ok: false,
  message: "Upload failed. Your existing image is unchanged, so you can try again.",
};

export function appendListingPhoto(photos: string[], url: string): string[] {
  return photos.includes(url) ? photos : [...photos, url];
}

function objectPath(userId: string, kind: StorageImageKind, file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const folder = kind === "listing" ? "listings" : "avatars";
  const nonce = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${userId}/${folder}/${nonce}.${extension}`;
}

/**
 * The one browser-side Storage seam for listing photos and avatars. It uses
 * only the signed-in user's anon client, uploads to an owner-prefixed path,
 * resolves the bucket's public URL, and applies that URL to the consumer.
 * Failures are values so the surrounding fixture/placeholder UI stays usable.
 */
export async function uploadStorageImage({
  client = getSupabaseBrowser() as ImageUploadClient | null,
  file,
  kind,
  userId,
  onUploaded,
}: {
  client?: ImageUploadClient | null;
  file: File;
  kind: StorageImageKind;
  userId: string;
  onUploaded: (url: string) => void | Promise<void>;
}): Promise<StorageUploadResult> {
  if (!client) {
    return {
      ok: false,
      message: "Storage is not configured. Your existing image is unchanged.",
    };
  }

  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "Choose an image file to upload." };
  }

  try {
    const bucket = client.storage.from(IMAGE_BUCKET);
    const { data, error } = await bucket.upload(objectPath(userId, kind, file), file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });
    if (error || !data?.path) {
      return UPLOAD_FAILURE;
    }

    const url = bucket.getPublicUrl(data.path).data.publicUrl;
    if (!url) {
      return {
        ok: false,
        message: "Upload finished, but its image URL is unavailable. Your existing image is unchanged.",
      };
    }

    await onUploaded(url);
    return { ok: true, url };
  } catch {
    return UPLOAD_FAILURE;
  }
}

/** Persist an uploaded public avatar URL through the caller's own RLS-scoped row. */
export async function saveProfileAvatar(
  userId: string,
  avatarUrl: string,
  client = getSupabaseBrowser() as ProfileAvatarClient | null,
): Promise<void> {
  if (!client) throw new Error("Storage is not configured");

  const { error } = await client
    .from("users")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId);

  if (error) throw new Error("Avatar could not be saved");
}
