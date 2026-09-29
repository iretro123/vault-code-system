const STEP_LABELS = ["Welcome", "Profile", "Avatar", "Experience", "Tour", "Goal", "Alerts", "Ready"];

export function OnboardingProgressBar({ current }: { current: number }) {
  const progress = Math.round((current / (STEP_LABELS.length - 1)) * 100);
  return <div className="onboarding-progress" aria-label={`Setup progress: ${progress}%`}>
    <div className="onboarding-progress-copy"><span>Vault setup</span><span>{STEP_LABELS[current]} · {progress}%</span></div>
    <div className="onboarding-progress-track" aria-hidden="true"><div style={{ width: `${progress}%` }} /></div>
  </div>;
}

export function OnboardingStep({ children, active }: { children: React.ReactNode; active: boolean }) {
  if (!active) return null;
  return <section className="onboarding-step animate-fade-in">{children}</section>;
}
