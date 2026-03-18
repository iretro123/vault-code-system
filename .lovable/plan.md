

## Fix White Screen — Make Capacitor Imports Invisible to Vite

**Problem**: Vite's dev server returns 500 on `src/main.tsx` because it statically analyzes dynamic `import("@capacitor/keyboard")` and tries to pre-bundle the module, which fails in the Lovable web environment.

**Solution**: Use `/* @vite-ignore */` comment plus a variable indirection to make the import specifier opaque to Vite's static analysis. This is a well-known Vite pattern. The dynamic import still works perfectly at runtime on native platforms — the `.catch()` handles the web case gracefully.

**Why this is safe for one codebase**: 
- On **web** (Lovable preview, published URL, any browser): `Capacitor.isNativePlatform()` returns `false`, so the native code paths never execute. Even if they did, the `.catch()` silently swallows the missing module.
- On **native iOS/Android** (Capacitor shell): The packages are installed via `node_modules` and resolved by the native build toolchain. The dynamic import succeeds normally.
- No code is removed — just the import syntax is made opaque to Vite's bundler.

### Changes (3 files, 5 import sites)

**`src/main.tsx`** — line 24:
```ts
const _kbMod = "@capacitor/keyboard";
import(/* @vite-ignore */ _kbMod)
```

**`src/lib/nativeFeedback.ts`** — lines 54, 65, 76 (three haptics imports):
```ts
const _hapMod = "@capacitor/haptics";
const mod = await import(/* @vite-ignore */ _hapMod);
const { Haptics, ImpactStyle } = mod;  // or NotificationType
```

**`src/hooks/usePushNotifications.ts`** — line 25:
```ts
const _pnMod = "@capacitor/push-notifications";
import(/* @vite-ignore */ _pnMod).then(...)
```

Each change is a minimal 1-2 line edit. All existing `.catch()` / `try/catch` error handling remains intact.

