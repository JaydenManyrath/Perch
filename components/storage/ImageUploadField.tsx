"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  uploadStorageImage,
  type StorageImageKind,
} from "@/lib/storage/image-upload";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function ImageUploadField({
  kind,
  label,
  userId,
  onUploaded,
}: {
  kind: StorageImageKind;
  label: string;
  userId: string | null | undefined;
  onUploaded: (url: string) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ status: "idle" });

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    if (!userId) {
      setState({ status: "error", message: "Sign in before uploading an image." });
      return;
    }

    setState({ status: "uploading" });
    const result = await uploadStorageImage({ file, kind, userId, onUploaded });
    setState(
      result.ok
        ? { status: "success", message: "Image uploaded and ready to use." }
        : { status: "error", message: result.message },
    );
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => void chooseFile(event.target.files?.[0])}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={state.status === "uploading"}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" aria-hidden />
        {state.status === "uploading" ? "Uploading..." : label}
      </Button>
      {state.status === "success" ? (
        <p role="status" className="inline-flex items-center gap-1 text-caption text-func-pass">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {state.message}
        </p>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="inline-flex items-start gap-1 text-caption text-func-scam">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {state.message}
        </p>
      ) : null}
    </div>
  );
}
