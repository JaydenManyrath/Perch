import Link from "next/link";
import { getMe, getListings } from "@/lib/data/source";
import { sublettersFixture } from "@/lib/fixtures";
import { PostListingForm } from "@/components/post/PostListingForm";
import { SubletterListings } from "@/components/post/SubletterListings";
import { EmptyState } from "@/components/ui/EmptyState";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";

/**
 * /post - the "post a sublease" surface (RA3). Gated on user_type === 'subletter'.
 * Because the demo runs without auth, ?as=subletter switches identity to a
 * seeded subletter (Elena) so the flow is drivable. RA4 confirm/relist
 * affordance lives in-page on the subletter's own listings.
 */
export default async function PostPage({ searchParams }: { searchParams: { as?: string } }) {
  const me = await getMe();
  const asSubletter = searchParams.as === "subletter";
  const acting = asSubletter ? sublettersFixture[0] : me;
  const isSubletter = acting.user_type === "subletter";

  if (!isSubletter) {
    return (
      <div className="px-4 pt-4 md:pt-8 pb-8">
        <header>
          <h1 className="text-h1 text-ink-strong">Post a sublease</h1>
          <p className="text-caption text-ink-soft">
            Only subletter accounts can post. Your account is an intern.
          </p>
        </header>
        <EmptyState
          title="This form is for subletters"
          body="In the demo, preview the flow as a subletter to see the form and the confirm/relist affordance."
          action={
            <Button asChild>
              <Link href="/post?as=subletter">Preview as subletter</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const listings = (await getListings()).filter((l) => l.created_by === acting.id);

  return (
    <div className="px-4 pt-4 md:pt-8 pb-8 flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink-strong">Post a sublease</h1>
          <p className="text-caption text-ink-soft">
            Posting as {acting.name}. Interns swipe your listing in the deck.
          </p>
        </div>
        {asSubletter ? (
          <Chip tone="accent">Demo view: subletter</Chip>
        ) : null}
      </header>

      <PostListingForm />

      <SubletterListings listings={listings} />
    </div>
  );
}
