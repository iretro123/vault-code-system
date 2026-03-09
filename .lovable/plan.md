

## Remove 3-Second Message Rate Limit

### Problem
There is a database trigger (`trg_message_rate_limit`) on `academy_messages` that blocks users from sending more than one message every 3 seconds. This makes the chat feel sluggish.

### Changes

**1. Database migration** — Drop the rate-limit trigger and function:
```sql
DROP TRIGGER IF EXISTS trg_message_rate_limit ON public.academy_messages;
DROP FUNCTION IF EXISTS public.check_message_rate_limit();
```

**2. `src/hooks/useRoomMessages.ts`** (line 182-183) — Remove the rate-limit-specific toast since the trigger no longer exists:
```typescript
// Remove: if (err.message.includes("Rate limit")) { toast.error("Please wait 3 seconds..."); }
```
Keep the generic error toast as fallback.

**3. `src/hooks/useTypingIndicator.ts`** — Clean up the dead 3s timeout and `timeoutRef` (lines 12, 58-62). Reduce receiver auto-remove from 3500ms to 1500ms so the typing indicator clears faster.

### Result
Users can send messages back-to-back with no artificial delay. Typing indicator clears faster too.

