import { Check, Circle } from "lucide-react";

export type PasswordCheck = {
  label: string;
  passed: boolean;
};

export function evaluatePassword(password: string, confirmPassword?: string): PasswordCheck[] {
  const checks: PasswordCheck[] = [
    { label: "At least 10 characters", passed: password.length >= 10 },
    { label: "One uppercase letter (A–Z)", passed: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a–z)", passed: /[a-z]/.test(password) },
    { label: "One number (0–9)", passed: /[0-9]/.test(password) },
    { label: "One symbol (! @ # $ % …)", passed: /[^A-Za-z0-9]/.test(password) },
    { label: "Not a common password (e.g. 'password123')", passed: password.length > 0 && !isCommonPassword(password) },
  ];
  if (confirmPassword !== undefined) {
    checks.push({
      label: "Both passwords match",
      passed: password.length > 0 && password === confirmPassword,
    });
  }
  return checks;
}

export function isPasswordStrong(password: string, confirmPassword?: string) {
  return evaluatePassword(password, confirmPassword).every((c) => c.passed);
}

// Small built-in list of obviously weak passwords. Supabase HIBP will still
// catch the long tail server-side, but this gives instant feedback.
const COMMON = new Set([
  "password", "password1", "password123", "passw0rd", "qwerty", "qwerty123",
  "12345678", "123456789", "1234567890", "111111", "abc123", "abcd1234",
  "letmein", "welcome", "welcome1", "iloveyou", "admin", "admin123",
  "monkey", "dragon", "sunshine", "princess", "football", "baseball",
  "vault", "vaultos", "trading", "trader",
]);

function isCommonPassword(pw: string) {
  return COMMON.has(pw.toLowerCase());
}

export function PasswordStrengthChecklist({
  password,
  confirmPassword,
}: {
  password: string;
  confirmPassword?: string;
}) {
  const checks = evaluatePassword(password, confirmPassword);
  const passedCount = checks.filter((c) => c.passed).length;
  const total = checks.length;
  const pct = Math.round((passedCount / total) * 100);

  const barColor =
    pct < 40 ? "bg-destructive"
    : pct < 80 ? "bg-amber-500"
    : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-border/40 bg-muted/30 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">Password requirements</p>
        <span className="text-[11px] text-muted-foreground">{passedCount}/{total}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-200`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1.5 pt-1">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2 text-xs">
            {c.passed ? (
              <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15">
                <Check className="h-3 w-3 text-emerald-500" />
              </span>
            ) : (
              <Circle className="mt-0.5 h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />
            )}
            <span className={c.passed ? "text-emerald-500" : "text-muted-foreground"}>
              {c.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
