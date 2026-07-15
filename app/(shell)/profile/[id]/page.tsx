import { EmptyState } from "@/components/ui/EmptyState";
import { getUserById, getMe } from "@/lib/data/source";
import { notFound } from "next/navigation";

/**
 * Profile — Phase 3 fills in the banded badge + pre-flight checklist.
 * Phase-2 stub: page exists at /profile/[id] (and /profile/me for self).
 */
export default async function ProfilePage({ params }: { params: { id: string } }) {
  const user = params.id === "me" ? await getMe() : await getUserById(params.id);
  if (!user) return notFound();

  return (
    <div className="px-4 pt-4 md:pt-8">
      <header>
        <h1 className="text-h1 text-ink-strong">{user.name}</h1>
        <p className="text-caption text-ink-soft">
          {user.role} at {user.company} · {user.city}
        </p>
      </header>
      <EmptyState
        title="Your profile"
        body="The banded badge + pre-flight checklist land in Phase 3."
        variant="idle"
      />
    </div>
  );
}
