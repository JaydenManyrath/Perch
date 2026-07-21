"use client";

import { useState } from "react";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { OfferStep } from "./_steps/OfferStep";
import { AccountStep, type AccountAssist } from "./_steps/AccountStep";
import { SpotifyStep } from "./_steps/SpotifyStep";
import { TakeoutStep } from "./_steps/TakeoutStep";
import { AvatarStep } from "./_steps/AvatarStep";
import { FlockStep } from "./_steps/FlockStep";
import { DoneStep } from "./_steps/DoneStep";
import { createAccountFromOffer } from "@/lib/data/source";
import type { OfferParse, Place, TasteProfile } from "@/lib/types/contract";

const LABELS = ["Offer", "Spotify", "Takeout", "Photo", "Flock", "Done"];

type State = {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  offer?: OfferParse;
  taste?: TasteProfile | null;
  places?: Place[] | null;
  accountEmail?: string;
  /** Visible account-creation assist between the correction screen and step 2. */
  account?: AccountAssist;
};

export default function OnboardingPage() {
  const [state, setState] = useState<State>({ step: 1 });

  return (
    <OnboardingLayout step={state.step} total={LABELS.length} labels={LABELS}>
      {state.step === 1 ? (
        state.account ? (
          <AccountStep
            assist={state.account}
            onContinue={() => setState((s) => ({ ...s, step: 2 }))}
          />
        ) : (
          <OfferStep
            onDone={async (offer) => {
              // The account is minted for the person ON the letter (never the
              // seeded persona) and starts with zero friends. The assist screen
              // makes the mint visible; any failure falls back to the fixture
              // identity with a plain note - no silent swap, no blocked flow.
              const name = offer.name ?? "";
              setState((s) => ({ ...s, offer, account: { phase: "creating", name } }));
              const account = await createAccountFromOffer(offer);
              setState((s) => ({
                ...s,
                account:
                  account.mode === "live"
                    ? { phase: "created", name, email: account.email }
                    : { phase: "fallback", name },
                accountEmail: account.mode === "live" ? account.email : undefined,
              }));
            }}
          />
        )
      ) : state.step === 2 ? (
        <SpotifyStep
          onDone={(taste) => setState((s) => ({ ...s, step: 3, taste }))}
        />
      ) : state.step === 3 ? (
        <TakeoutStep
          onDone={(places) => setState((s) => ({ ...s, step: 4, places }))}
        />
      ) : state.step === 4 ? (
        <AvatarStep onDone={() => setState((s) => ({ ...s, step: 5 }))} />
      ) : state.step === 5 ? (
        <FlockStep onDone={() => setState((s) => ({ ...s, step: 6 }))} />
      ) : (
        <DoneStep accountEmail={state.accountEmail} />
      )}
    </OnboardingLayout>
  );
}
