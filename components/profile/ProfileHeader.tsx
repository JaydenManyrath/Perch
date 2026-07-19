import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { BandedBadge } from "@/components/ui/BandedBadge";
import { Chip } from "@/components/ui/Chip";
import type { UserRow } from "@/lib/types/contract";
import { formatMonthDay } from "@/lib/utils";

/**
 * ProfileHeader - decision surface (identity + trust). No mascot here.
 */
export function ProfileHeader({ user }: { user: UserRow }) {
  return (
    <header className="flex flex-col sm:flex-row items-start gap-4 sm:items-center">
      <ProfileAvatar userId={user.id} name={user.name} initialUrl={user.avatar_url} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-h1 text-ink-strong">{user.name}</h1>
          {user.verified ? <BandedBadge /> : null}
        </div>
        <p className="mt-1 text-body text-ink-soft">
          {user.role} at {user.company} · {user.city}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Chip tone="muted">Moves {formatMonthDay(user.move_in_date)}</Chip>
          {user.taste_profile?.topGenres?.slice(0, 3).map((g) => (
            <Chip key={g}>{g}</Chip>
          ))}
        </div>
      </div>
    </header>
  );
}
