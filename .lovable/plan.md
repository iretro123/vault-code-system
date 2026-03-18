

## Fix Capacitor Build Errors + Replace Polling Cron with One-Shot Timer

Two issues to address:

### 1. Capacitor Module Build Errors

The three Capacitor packages (`@capacitor/push-notifications`, `@capacitor/haptics`, `@capacitor/keyboard`) are in `package.json` but failing to resolve in the Lovable web build. These are native-only — they should never block the web build.

**Fix**: Use dynamic `import()` instead of static imports in all three files so they only load at runtime on native platforms:

- **`src/hooks/usePushNotifications.ts`** — Change `import { PushNotifications } from "@capacitor/push-notifications"` to a dynamic import inside the effect, after the native platform check.
- **`src/lib/nativeFeedback.ts`** — Change `import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics"` to dynamic imports inside each function, after the `isNativePlatform()` guard.
- **`src/main.tsx`** — Change `import { Keyboard } from "@capacitor/keyboard"` to a dynamic import inside the native-only code block.

This ensures the web build never tries to resolve these native modules.

### 2. Replace 5-Minute Polling Cron with a One-Shot Scheduled Cleanup

Instead of the `cleanup-live-now` cron running every 5 minutes forever, we schedule a one-shot cleanup exactly 2 hours after `start_live_now()` is called.

**Approach**: Modify `start_live_now()` to schedule a `cron.schedule` job with a cron expression matching "2 hours from now" (using `date_part` on `now() + interval '2 hours'`). The job name includes the session ID so it's unique. The job runs once, cleans up that specific session, then unschedules itself.

Remove the global `*/5 * * * *` cron entirely.

**Migration SQL**:
- Unschedule `cleanup-live-now`
- Drop `cleanup_live_now()` (no longer needed)
- Update `start_live_now()` to schedule a one-shot cron at `now() + 2h`
- Update `stop_live_now()` to also unschedule the pending cron job for the session being stopped

