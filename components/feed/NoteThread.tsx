import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import type { NoteRow, UserRow } from "@/lib/types/contract";

/**
 * NoteThread — past-intern Q&A (A4). Interleaved with events in the Flyway feed.
 * Decision surface — no mascot here.
 */
export function NoteThread({ note, author }: { note: NoteRow; author?: UserRow }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {author?.avatar_url ? <AvatarImage src={author.avatar_url} alt="" /> : null}
            <AvatarFallback>{author?.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="truncate">{note.topic}</CardTitle>
            <CardDescription className="mt-0.5 flex items-center gap-2 flex-wrap">
              <span>{author?.name ?? "an intern"}</span>
              <span aria-hidden>·</span>
              <Chip tone="muted">{note.area ? `${note.area}, ${note.city}` : note.city}</Chip>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-body text-ink-strong whitespace-pre-line">{note.body}</p>
      </CardContent>
    </Card>
  );
}
