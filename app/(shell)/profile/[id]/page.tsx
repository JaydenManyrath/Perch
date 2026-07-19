import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { PreflightChecklist } from "@/components/profile/PreflightChecklist";
import { SubletterProfile } from "@/components/profile/SubletterProfile";
import { FriendActionButton } from "@/components/friends/FriendActionButton";
import { MessageActionButton } from "@/components/dms/MessageActionButton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { getUserById, getMe, getChecklist, getPublicProfile } from "@/lib/data/server-source";
import { getInitialSession } from "@/lib/auth/server-session";

/**
 * /profile/[id] - RA6 tappable profiles.
 * For interns (own or others): the classic v1 profile.
 * For subletters: the SubletterProfile view (listings + reviews + summary).
 */
export default async function ProfilePage({ params }: { params: { id: string } }) {
  const session = await getInitialSession();
  const viewerId = session.currentUser?.id ?? null;
  const user =
    params.id === "me" || params.id === viewerId ? await getMe() : await getUserById(params.id);
  if (!user) return notFound();

  const isMe = user.id === viewerId;

  // Subletter view (listings + reviews + summary) with Message host at the top.
  if (user.user_type === "subletter") {
    const profile = await getPublicProfile(user.id);
    if (!profile) return notFound();
    return (
      <div className="px-4 pt-4 md:pt-8 pb-8">
        <SubletterProfile
          profile={profile}
          headerAction={
            !isMe ? <MessageActionButton userId={user.id} label="Message host" size="md" /> : null
          }
        />
      </div>
    );
  }

  const checklist = isMe ? await getChecklist(user.id) : [];

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8 flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <ProfileHeader user={user} />
        {!isMe ? (
          <div className="flex flex-col gap-2 shrink-0 items-end">
            <MessageActionButton userId={user.id} />
            <FriendActionButton userId={user.id} />
          </div>
        ) : null}
      </div>

      {user.taste_profile ? (
        <Card>
          <CardHeader>
            <CardTitle>Taste</CardTitle>
            <CardDescription>From Spotify - the read-only taste profile.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {user.taste_profile.topArtists.slice(0, 6).map((a) => (
              <Chip key={a}>{a}</Chip>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {isMe ? (
        <>
          <PreflightChecklist initial={checklist} />
          <Card>
            <CardHeader>
              <CardTitle>Landing</CardTitle>
              <CardDescription>
                Your first-week plan for after you arrive.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/landing"
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-100 text-ink-strong px-4 py-2 font-semibold hover:bg-sky-200 transition-colors"
              >
                Open landing plan <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
