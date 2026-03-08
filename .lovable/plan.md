

## Match Signup Page to Login Page Premium Style

### Changes (1 file: `src/pages/Signup.tsx`)

**1. Background** (line 183)
Replace flat `bg-background` with the same luxury blue-glow gradient from Auth.tsx:
```tsx
<div
  className="min-h-screen flex items-center justify-center px-4 py-6"
  style={{
    background: `
      radial-gradient(ellipse 70% 50% at 50% 40%, rgba(59,130,246,0.10) 0%, transparent 70%),
      radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.22) 0%, transparent 55%),
      radial-gradient(ellipse 60% 50% at 20% 80%, rgba(59,130,246,0.10) 0%, transparent 50%),
      radial-gradient(ellipse 50% 40% at 80% 70%, rgba(99,102,241,0.08) 0%, transparent 50%),
      radial-gradient(ellipse 40% 30% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 60%),
      linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
    `
  }}
>
```

**2. Logo** (lines 186-192)
Replace the Shield icon + small text with the same bold wordmark from Auth:
```tsx
<div className="text-center mb-8">
  <h1 className="text-5xl font-black tracking-tight">
    <span className="text-foreground">VAULT</span>
    <span className="text-primary">OS</span>
  </h1>
  <p className="text-muted-foreground text-sm mt-2">Join Vault Academy</p>
</div>
```

**3. Card styling** (line 195)
Match the login card's border/shadow:
```tsx
<div className="rounded-2xl border border-border/40 bg-card p-8 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
```

**4. Input styling** (line 179)
Update `inputClass` to match login's taller, rounded-xl inputs:
```tsx
const inputClass = "h-12 bg-muted/50 border-border/40 rounded-xl text-sm ...";
```

**5. Button** — match login's `h-12 rounded-xl font-semibold` style with hover glow.

**6. Remove** unused `Shield` import.

All logic stays identical — only visual wrapper changes.

