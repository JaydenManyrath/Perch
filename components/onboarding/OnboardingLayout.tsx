import { ProgressStepper } from "./ProgressStepper";
import { BranchMotif } from "@/components/theme/BranchMotif";

/** Shared onboarding chrome: stepper + centered content area. */
export function OnboardingLayout({
  step,
  total,
  labels,
  children,
}: {
  step: number;
  total: number;
  labels: string[];
  children: React.ReactNode;
}) {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-sky-50 flex flex-col">
      {/* Decorative branch backdrop in opposite corners - behind all content. */}
      <BranchMotif
        variant="corner"
        className="absolute bottom-0 left-0 -z-10 w-40 opacity-50 md:w-56"
      />
      <BranchMotif
        variant="corner"
        className="absolute right-0 top-0 -z-10 w-40 -scale-x-100 -scale-y-100 opacity-50 md:w-56"
      />
      <div className="mx-auto w-full max-w-lg px-6 py-6 flex-1 flex flex-col">
        <ProgressStepper step={step} total={total} labels={labels} />
        <div className="mt-8 flex-1 flex flex-col">{children}</div>
      </div>
    </main>
  );
}
