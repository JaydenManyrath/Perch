import { notFound } from "next/navigation";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { PreflightChecklist } from "@/components/profile/PreflightChecklist";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import Link from "next/link";
import { getUserById, getMe, getChecklist } from "@/lib/data/source";
import { ME_ID } from "@/lib/fixtures/users";
import { ArrowRight } from "lucide-react";

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const user = params.id === "me" ? await getMe() : await getUserById(params.id);
  if (!user) return notFound();

  const isMe = user.id === ME_ID;
  const checklist = isMe ? await getChecklist(user.id) : [];

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8 flex flex-col gap-6">
      <ProfileHeader user={user} />

      {user.taste_profile ? (
        <Card>
          <CardHeader>
            <CardTitle>Taste</CardTitle>
            <CardDescription>From your Spotify — the read-only taste profile.</CardDescription>
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
