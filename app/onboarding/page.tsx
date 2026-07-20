"use client";

import { useState } from "react";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { OfferStep } from "./_steps/OfferStep";
import { SpotifyStep } from "./_steps/SpotifyStep";
import { TakeoutStep } from "./_steps/TakeoutStep";
import { FlockStep } from "./_steps/FlockStep";
import { DoneStep } from "./_steps/DoneStep";
import type { OfferParse, Place, TasteProfile } from "@/lib/types/contract";

const LABELS = ["Offer", "Spotify", "Takeout", "Flock", "Done"];

type State = {
  step: 1 | 2 | 3 | 4 | 5;
  offer?: OfferParse;
  taste?: TasteProfile | null;
  places?: Place[] | null;
};

export default function OnboardingPage() {
  const [state, setState] = useState<State>({ step: 1 });

  return (
    <OnboardingLayout step={state.step} total={LABELS.length} labels={LABELS}>
      {state.step === 1 ? (
        <OfferStep
          onDone={(offer) => setState({ step: 2, offer })}
        />
      ) : state.step === 2 ? (
        <SpotifyStep
          onDone={(taste) => setState((s) => ({ ...s, step: 3, taste }))}
        />
      ) : state.step === 3 ? (
        <TakeoutStep
          onDone={(places) => setState((s) => ({ ...s, step: 4, places }))}
        />
      ) : state.step === 4 ? (
        <FlockStep onDone={() => setState((s) => ({ ...s, step: 5 }))} />
      ) : (
        <DoneStep />
      )}
    </OnboardingLayout>
  );
}
