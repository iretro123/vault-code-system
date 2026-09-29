import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const entryStyles = readFileSync(resolve(process.cwd(), "src/pages/welcome.css"), "utf8");
const authSource = readFileSync(resolve(process.cwd(), "src/pages/Auth.tsx"), "utf8");
const authStyles = readFileSync(resolve(process.cwd(), "src/pages/auth.css"), "utf8");

describe("native entry keyboard layout", () => {
  it("uses the visible viewport instead of keeping the form behind the keyboard", () => {
    expect(entryStyles).toContain("body.native-capacitor .vault-entry { height:var(--academy-visible-height,100dvh); }");
    expect(authSource).toContain('minHeight: "var(--academy-visible-height, 100dvh)"');
  });

  it("compacts the login introduction only while the native keyboard is open", () => {
    expect(authStyles).toContain("body.native-capacitor.native-keyboard-open .vault-login-content { justify-content:flex-start;");
    expect(authStyles).toContain("body.native-capacitor.native-keyboard-open .vault-login-title h1 { font-size:28px;");
  });

  it("preserves entry gutters over the shared native safe-area rule", () => {
    expect(entryStyles).toContain("body.native-capacitor .vault-entry.academy-main-safe { padding-left:max(24px,env(safe-area-inset-left,0px)); padding-right:max(24px,env(safe-area-inset-right,0px)); }");
  });
});
