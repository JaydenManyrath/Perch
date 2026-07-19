"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { postListing } from "@/lib/data/source";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { CheckCircle2, Plus, X } from "lucide-react";
import type { PostListingInput } from "@/lib/types/contract";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/auth/session";
import { ImageUploadField } from "@/components/storage/ImageUploadField";
import { appendListingPhoto } from "@/lib/storage/image-upload";

/**
 * PostListingForm (RA3 + RA32) - subletter posts a sublease.
 * Round 3: adds furnished, pros, bed/bath/sqft, amenities, utilities.
 * Info-first, decision surface, no mascot.
 */
export function PostListingForm() {
  const router = useRouter();
  const { currentUser } = useCurrentUser();
  const [state, setState] = useState<PostListingInput>({
    title: "",
    address: "",
    lat: 47.6062,
    lng: -122.3321,
    price: 1800,
    leaseStart: "2026-06-08",
    leaseEnd: "2026-08-14",
    leaseType: "sublet",
    photos: [],
    safetyNotes: [],
    // Round 3 defaults
    furnished: true,
    pros: [],
    bedrooms: 1,
    bathrooms: 1,
    sqft: null,
    amenities: [],
    utilitiesIncluded: null,
  });
  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [prosDraft, setProsDraft] = useState("");
  const [amenityDraft, setAmenityDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [posted, setPosted] = useState<string | null>(null);

  function set<K extends keyof PostListingInput>(key: K, val: PostListingInput[K]) {
    setState((s) => ({ ...s, [key]: val }));
  }

  function addPhoto() {
    if (!photoUrl.trim()) return;
    setState((s) => ({ ...s, photos: [...s.photos, photoUrl.trim()] }));
    setPhotoUrl("");
  }

  function addUploadedPhoto(url: string) {
    setState((s) => ({
      ...s,
      photos: appendListingPhoto(s.photos, url),
    }));
    setUploadedPreviewUrl(url);
  }

  function addPro() {
    const v = prosDraft.trim();
    if (!v) return;
    setState((s) => ({ ...s, pros: [...(s.pros ?? []), v] }));
    setProsDraft("");
  }
  function removePro(i: number) {
    setState((s) => ({ ...s, pros: (s.pros ?? []).filter((_, idx) => idx !== i) }));
  }

  function addAmenity() {
    const v = amenityDraft.trim();
    if (!v) return;
    setState((s) => ({ ...s, amenities: [...(s.amenities ?? []), v] }));
    setAmenityDraft("");
  }
  function removeAmenity(i: number) {
    setState((s) => ({ ...s, amenities: (s.amenities ?? []).filter((_, idx) => idx !== i) }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.title.trim() || !state.address.trim()) return;
    setBusy(true);
    try {
      const created = await postListing(state);
      setPosted(created.id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New sublease</CardTitle>
        <CardDescription>
          Interns swipe your listing in the deck. Keep it accurate; the system will
          ask you to confirm every couple of weeks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {posted ? (
          <div className="rounded-2xl border border-func-passBg bg-func-passBg text-func-pass p-3 mb-3 inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" aria-hidden strokeWidth={2.5} />
            <span className="font-semibold text-caption">
              Posted. It now shows in the perches deck (id: {posted}).
            </span>
          </div>
        ) : null}

        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Title" required>
            <input
              type="text"
              value={state.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Sunny 1BR near Cap Hill"
              className={inputCls}
              required
            />
          </Field>
          <Field label="Address" required>
            <input
              type="text"
              value={state.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="123 Broadway, Seattle, WA"
              className={inputCls}
              required
            />
          </Field>

          <Field label="Price (USD / mo)" required>
            <input
              type="number"
              min={100}
              max={20000}
              value={state.price}
              onChange={(e) => set("price", Number(e.target.value))}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Lease type">
            <select
              value={state.leaseType}
              onChange={(e) => set("leaseType", e.target.value as PostListingInput["leaseType"])}
              className={inputCls}
            >
              <option value="sublet">Sublet</option>
              <option value="short_term">Short term</option>
              <option value="standard">Standard</option>
            </select>
          </Field>

          <Field label="Lease start (ISO)">
            <input
              type="date"
              value={state.leaseStart}
              onChange={(e) => set("leaseStart", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Lease end (ISO)">
            <input
              type="date"
              value={state.leaseEnd}
              onChange={(e) => set("leaseEnd", e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* Round 3 (RA32): furnished + specs + utilities */}
          <Field label="Furnished">
            <div className="flex gap-2">
              <ToggleButton active={state.furnished === true} onClick={() => set("furnished", true)}>
                Furnished
              </ToggleButton>
              <ToggleButton active={state.furnished === false} onClick={() => set("furnished", false)}>
                Unfurnished
              </ToggleButton>
            </div>
          </Field>
          <Field label="Utilities">
            <div className="flex gap-2">
              <ToggleButton
                active={state.utilitiesIncluded === true}
                onClick={() => set("utilitiesIncluded", true)}
              >
                Included
              </ToggleButton>
              <ToggleButton
                active={state.utilitiesIncluded === false}
                onClick={() => set("utilitiesIncluded", false)}
              >
                Not included
              </ToggleButton>
            </div>
          </Field>

          <Field label="Bedrooms (0 = studio)">
            <input
              type="number"
              min={0}
              max={10}
              value={state.bedrooms ?? 0}
              onChange={(e) => set("bedrooms", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Bathrooms">
            <input
              type="number"
              min={0}
              max={10}
              step="0.5"
              value={state.bathrooms ?? 1}
              onChange={(e) => set("bathrooms", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Square feet" className="sm:col-span-2">
            <input
              type="number"
              min={100}
              max={10000}
              value={state.sqft ?? ""}
              onChange={(e) => set("sqft", e.target.value ? Number(e.target.value) : null)}
              placeholder="500"
              className={inputCls}
            />
          </Field>

          <Field label="Pros" className="sm:col-span-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={prosDraft}
                onChange={(e) => setProsDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPro();
                  }
                }}
                placeholder="e.g. Walk to five coffee shops"
                className={inputCls}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addPro}
                disabled={!prosDraft.trim()}
              >
                <Plus className="h-4 w-4" aria-hidden /> Add
              </Button>
            </div>
            {(state.pros ?? []).length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {(state.pros ?? []).map((p, i) => (
                  <li key={p + i}>
                    <button
                      type="button"
                      onClick={() => removePro(i)}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-ink-strong text-caption font-semibold px-2.5 py-0.5 hover:bg-sky-200"
                    >
                      {p}
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Field>

          <Field label="Amenities" className="sm:col-span-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={amenityDraft}
                onChange={(e) => setAmenityDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAmenity();
                  }
                }}
                placeholder="e.g. In-unit laundry"
                className={inputCls}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addAmenity}
                disabled={!amenityDraft.trim()}
              >
                <Plus className="h-4 w-4" aria-hidden /> Add
              </Button>
            </div>
            {(state.amenities ?? []).length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {(state.amenities ?? []).map((a, i) => (
                  <li key={a + i}>
                    <button
                      type="button"
                      onClick={() => removeAmenity(i)}
                      className="inline-flex items-center gap-1 rounded-full bg-sky-100 text-ink-strong text-caption font-semibold px-2.5 py-0.5 hover:bg-sky-200"
                    >
                      {a}
                      <X className="h-3 w-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Field>

          <Field label="Latitude">
            <input
              type="number"
              step="0.0001"
              value={state.lat}
              onChange={(e) => set("lat", Number(e.target.value))}
              className={inputCls}
            />
          </Field>
          <Field label="Longitude">
            <input
              type="number"
              step="0.0001"
              value={state.lng}
              onChange={(e) => set("lng", Number(e.target.value))}
              className={inputCls}
            />
          </Field>

          <Field label="Listing photo" className="sm:col-span-2">
            <div className="mb-3 flex flex-col items-start gap-2">
              <ImageUploadField
                kind="listing"
                label="Upload listing photo"
                userId={currentUser?.id}
                onUploaded={addUploadedPhoto}
              />
              {uploadedPreviewUrl ? (
                <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-2xl bg-sky-100">
                  <Image
                    src={uploadedPreviewUrl}
                    alt="Uploaded listing preview"
                    fill
                    sizes="320px"
                    className="object-cover"
                  />
                </div>
              ) : null}
            </div>
            <span className="mb-1 block text-caption text-ink-soft">
              Or add an existing photo URL
            </span>
            <div className="flex gap-2">
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className={inputCls}
              />
              <Button type="button" variant="secondary" onClick={addPhoto} disabled={!photoUrl.trim()}>
                Add photo
              </Button>
            </div>
            {state.photos.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {state.photos.map((p, i) => (
                  <Chip key={p + i}>photo {i + 1}</Chip>
                ))}
              </div>
            ) : null}
          </Field>

          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={busy || !state.title || !state.address}>
              {busy ? "Posting..." : "Post the sublease"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const inputCls =
  "w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-body text-ink-strong focus:outline-none focus:ring-2 focus:ring-sky-500";

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-caption text-ink-soft mb-1">
        {label}
        {required ? <span className="text-func-scam"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex-1 rounded-xl border px-3 py-2 text-caption font-semibold transition-colors",
        active
          ? "bg-sky-500 text-white border-sky-500"
          : "bg-white text-ink-strong border-sky-300 hover:bg-sky-50",
      )}
    >
      {children}
    </button>
  );
}
