import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const onboarding = readFileSync("src/components/onboarding/AppOnboarding.tsx", "utf8");
const tour = readFileSync("src/components/onboarding/VaultTourCarousel.tsx", "utf8");
const styles = readFileSync("src/components/onboarding/app-onboarding.css", "utf8");
const app = readFileSync("src/App.tsx", "utf8");

describe("premium onboarding experience", () => {
  it("keeps full name separate from the public display name", () => {
    expect(onboarding).toContain('htmlFor="onboarding-full-name"');
    expect(onboarding).toContain('htmlFor="onboarding-display-name"');
    expect(onboarding).toContain('data: { full_name: fullName.trim() }');
    expect(onboarding).toContain('display_name: displayName.trim()');
    expect(onboarding).toContain('disabled={!fullName.trim() || !displayName.trim()}');
  });
  it("teaches the real navigation before handing users to Home", () => {
    for (const destination of ["Home", "Learn", "Community", "Vault Live", "Trade OS", "Ask Coach"]) {
      expect(tour).toContain(`title: "${destination}"`);
    }
    expect(tour).toContain("Start every day HERE.");
    expect(onboarding).toContain("<VaultArrival");
  });

  it("allows correction and avoids forcing an avatar choice", () => {
    expect(onboarding).toContain("const previous = () => setStep");
    expect(onboarding).toContain("Continue with my initials");
    expect(onboarding).not.toContain("disabled={!avatarUrl}");
  });

  it("transitions to Home after successful setup without a second confirmation", () => {
    expect(onboarding).not.toContain("Auto-advance after 1.5s");
    expect(onboarding).toContain('navigate("/academy/home", { replace: true })');
    expect(onboarding).not.toContain("Your Vault is Ready");
    expect(onboarding).toContain("onComplete={handleDismiss}");
  });

  it("offers a local-only preview without changing a real member", () => {
    expect(app).toContain('import.meta.env.DEV && <Route path="/__preview/onboarding"');
    expect(onboarding.indexOf("if (isPreview)")).toBeLessThan(onboarding.indexOf("if (!user) return;"));
    expect(onboarding).toContain('? "/__preview/onboarding/home" : "/academy/home"');
    expect(app).toContain('import.meta.env.DEV && <Route path="/__preview/onboarding/home"');
  });

  it("uses native push permission and respects the iOS visual viewport", () => {
    expect(onboarding).toContain("requestPushPermission");
    expect(styles).toContain("height:var(--academy-visible-height,100dvh)");
    expect(styles).toContain("body.native-capacitor.native-keyboard-open .onboarding-progress{display:none}");
  });
});
