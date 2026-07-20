"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Camera, SkipForward } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { InitialsAvatar } from "@/components/ui/InitialsAvatar";
import { getMe } from "@/lib/data/source";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { saveProfileAvatar, uploadStorageImage } from "@/lib/storage/image-upload";

/**
 * Step: Add a photo (RA52) - an OPTIONAL profile picture. Picking an image shows a
 * local preview immediately (object URL) so it works with zero live keys; the
 * storage helper is only called when Supabase is actually configured. Skipping is
 * one tap and nothing here (or anywhere) requires an avatar - skip and the shared
 * InitialsAvatar shows the person's initials instead.
 */
export function AvatarStep({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");

  useEffect(() => {
    let active = true;
    void getMe().then((me) => {
      if (active) setName(me.name);
    });
    return () => {
      active = false;
    };
  }, []);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function choose(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    // Instant local preview - never depends on a network or a key.
    setPreviewUrl(URL.createObjectURL(file));
    // Persist through the storage helper ONLY when Supabase is configured.
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (userId) {
        await uploadStorageImage({
          file,
          kind: "avatar",
          userId,
          onUploaded: (url) => saveProfileAvatar(userId, url),
        });
      }
    } catch {
      // Fixture-first: an upload failure never blocks - the local preview stands.
    } finally {
      setBusy(false);
    }
  }

  return (
    <AvatarStepView
      name={name}
      previewUrl={previewUrl}
      busy={busy}
      onChoose={choose}
      onDone={onDone}
    />
  );
}

/** Presentational body - pure props, so it renders in the node test env. */
export function AvatarStepView({
  name,
  previewUrl,
  busy,
  onChoose,
  onDone,
}: {
  name: string;
  previewUrl: string | null;
  busy: boolean;
  onChoose: (file: File | undefined) => void;
  onDone: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-6">
      <header className="text-center">
        <Mascot variant="idle" size={120} />
        <h2 className="text-h2 text-ink-strong mt-4">
          Add a photo - <em className="not-italic text-ink-soft">optional</em>
        </h2>
        <p className="mt-1 text-body text-ink-soft">
          Put a face to your name so your flock knows you. Totally optional - skip it
          and your initials show instead.
        </p>
      </header>

      <div className="flex flex-col items-center gap-4">
        <InitialsAvatar name={name} src={previewUrl} size={112} fallbackClassName="text-h1" />
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-2 rounded-2xl border border-sky-300 bg-white px-4 py-2 text-body font-semibold text-ink-strong shadow-card hover:bg-sky-100 transition-colors">
            <Camera className="h-4 w-4" aria-hidden />
            {previewUrl ? "Choose a different photo" : "Choose a photo"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => onChoose(event.currentTarget.files?.[0])}
          />
        </label>
        {busy ? <p className="text-caption text-ink-soft">Saving your photo...</p> : null}
      </div>

      <div className="mt-auto pt-6 flex flex-col gap-2">
        <Button size="lg" className="w-full" onClick={onDone}>
          {previewUrl ? "Looks good" : "Continue"} <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        <Button variant="ghost" onClick={onDone}>
          <SkipForward className="h-4 w-4" aria-hidden /> Skip - use my initials
        </Button>
      </div>
    </div>
  );
}
