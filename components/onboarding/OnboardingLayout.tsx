import { ProgressStepper } from "./ProgressStepper";

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
    <main className="min-h-dvh bg-sky-50 flex flex-col">
      <div className="mx-auto w-full max-w-lg px-6 py-6 flex-1 flex flex-col">
        <ProgressStepper step={step} total={total} labels={labels} />
        <div className="mt-8 flex-1 flex flex-col">{children}</div>
      </div>
    </main>
  );
}
