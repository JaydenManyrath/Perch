import { describe, expect, it, vi } from "vitest";
import {
  appendListingPhoto,
  saveProfileAvatar,
  uploadStorageImage,
  type ImageUploadClient,
  type ProfileAvatarClient,
} from "@/lib/storage/image-upload";

function imageFile(name = "room.jpg"): File {
  return { name, type: "image/jpeg" } as File;
}

function storageClient(options?: { uploadError?: string; publicUrl?: string }) {
  const upload = vi.fn(async (path: string) =>
    options?.uploadError
      ? { data: null, error: { message: options.uploadError } }
      : { data: { path }, error: null },
  );
  const getPublicUrl = vi.fn(() => ({
    data: { publicUrl: options?.publicUrl ?? "https://project.supabase.co/storage/v1/object/public/listing-photos/photo.jpg" },
  }));

  return {
    upload,
    getPublicUrl,
    client: {
      storage: {
        from: vi.fn(() => ({ upload, getPublicUrl })),
      },
    } as ImageUploadClient,
  };
}

function avatarClient(options?: { updateError?: string }) {
  const eq = vi.fn(async () => ({
    error: options?.updateError ? { message: options.updateError } : null,
  }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { from, update, eq, client: { from } as ProfileAvatarClient };
}

describe("shared Storage image upload seam", () => {
  it("propagates a successful listing-photo URL to the listing consumer", async () => {
    const stored = storageClient();
    let photos: string[] = [];

    const result = await uploadStorageImage({
      client: stored.client,
      file: imageFile(),
      kind: "listing",
      userId: "subletter-1",
      onUploaded: (url) => {
        photos = appendListingPhoto(photos, url);
      },
    });

    expect(result).toEqual({ ok: true, url: photos[0] });
    expect(photos).toEqual([
      "https://project.supabase.co/storage/v1/object/public/listing-photos/photo.jpg",
    ]);
    expect(stored.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^subletter-1\/listings\/.+\.jpg$/),
      expect.anything(),
      expect.objectContaining({ contentType: "image/jpeg", upsert: false }),
    );
  });

  it("keeps the listing consumer usable when upload fails", async () => {
    const stored = storageClient({ uploadError: "bucket unavailable" });
    const onUploaded = vi.fn();

    const result = await uploadStorageImage({
      client: stored.client,
      file: imageFile(),
      kind: "listing",
      userId: "subletter-1",
      onUploaded,
    });

    expect(result).toEqual({
      ok: false,
      message: "Upload failed. Your existing image is unchanged, so you can try again.",
    });
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("propagates an uploaded avatar URL to the signed-in user's profile row", async () => {
    const stored = storageClient({
      publicUrl: "https://project.supabase.co/storage/v1/object/public/listing-photos/avatar.png",
    });
    const profile = avatarClient();
    let visibleAvatar: string | null = null;

    const result = await uploadStorageImage({
      client: stored.client,
      file: imageFile("avatar.png"),
      kind: "avatar",
      userId: "intern-1",
      onUploaded: async (url) => {
        await saveProfileAvatar("intern-1", url, profile.client);
        visibleAvatar = url;
      },
    });

    expect(result).toEqual({ ok: true, url: visibleAvatar });
    expect(profile.update).toHaveBeenCalledWith({ avatar_url: visibleAvatar });
    expect(profile.eq).toHaveBeenCalledWith("id", "intern-1");
    expect(stored.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^intern-1\/avatars\/.+\.png$/),
      expect.anything(),
      expect.anything(),
    );
  });

  it("does not change the profile consumer when avatar upload fails", async () => {
    const stored = storageClient({ uploadError: "not authorized" });
    const profile = avatarClient();

    const result = await uploadStorageImage({
      client: stored.client,
      file: imageFile("avatar.png"),
      kind: "avatar",
      userId: "intern-1",
      onUploaded: (url) => saveProfileAvatar("intern-1", url, profile.client),
    });

    expect(result.ok).toBe(false);
    expect(profile.from).not.toHaveBeenCalled();
  });
});
