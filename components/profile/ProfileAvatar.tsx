"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { ImageUploadField } from "@/components/storage/ImageUploadField";
import { useCurrentUser } from "@/lib/auth/session";
import { saveProfileAvatar } from "@/lib/storage/image-upload";

export function ProfileAvatar({
  userId,
  name,
  initialUrl,
}: {
  userId: string;
  name: string;
  initialUrl: string | null;
}) {
  const { currentUser } = useCurrentUser();
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);
  const editable = currentUser?.id === userId;

  async function applyAvatar(url: string) {
    await saveProfileAvatar(userId, url);
    setAvatarUrl(url);
  }

  return (
    <div className="flex shrink-0 flex-col items-start gap-2">
      <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="text-h1">{name[0]}</AvatarFallback>
      </Avatar>
      {editable ? (
        <ImageUploadField
          kind="avatar"
          label="Upload avatar"
          userId={currentUser.id}
          onUploaded={applyAvatar}
        />
      ) : null}
    </div>
  );
}
