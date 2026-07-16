"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { postListing } from "@/lib/data/source";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { CheckCircle2 } from "lucide-react";
import type { PostListingInput } from "@/lib/types/contract";

/**
 * PostListingForm (RA3) - subletter posts a sublease.
 * Simple, info-first fields. On submit -> postListing (live -> POST /api/listings;
 * fixture -> echo into the deck). Decision surface: no mascot.
 */
export function PostListingForm() {
  const router = useRouter();
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
  });
  const [photoUrl, setPhotoUrl] = useState("");
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.title.trim() || !state.address.trim()) return;
    setBusy(true);
    try {
      const created = await postListing(state);
      setPosted(created.id);
      // Refresh the page so the new listing appears in the Your Listings section below.
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

          <Field label="Photo URL" className="sm:col-span-2">
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
