

## Fix: Message Spacing + Discord-Style Reply Rendering

### Problems
1. **Messages too cramped** — grouped messages use `py-[1px]` and new groups use `pt-1.5 pb-0.5`, giving almost zero breathing room between different users' messages
2. **Reply quotes are flat text blocks** — when someone replies, the quoted text shows as a generic left-border block with no visual connection to the original message (no "arm" connector like Discord)

### Changes

**`src/components/academy/RoomChat.tsx`**

#### 1) Increase message spacing to match Discord
- New message groups (different user): change from `pt-1.5 pb-0.5 mt-[1px]` to `pt-3 pb-1 mt-1` — gives clear visual separation between users
- Grouped follow-ups (same user): change from `py-[1px]` to `py-0.5` — slight breathing room without feeling cramped
- This matches Discord where each new user block has noticeable top spacing

#### 2) Redesign reply/quote rendering to Discord-style with connector arm
Replace the current flat `border-l-2` quote block in `renderPlainBody` with a Discord-style reply indicator:

- Add a new component rendered **above** the message body (not inline) when quote lines are detected
- The reply indicator shows: a curved connector arm (`┌─`), small avatar placeholder circle, the replying-to username in bold, and a truncated preview of the original message
- Styling: `flex items-center gap-1.5 text-[12px] text-muted-foreground ml-6 mb-0.5` with a small `╭` SVG/border-radius connector line going from the reply preview down to the actual message
- The connector uses a `before:` pseudo-element or a small inline SVG curve (2px wide, ~16px tall, border-left + border-top with rounded corner)
- Remove the old `border-l-2 pl-2.5 bg-primary/[0.06]` block quote style for replies — keep it only for manually typed `>` quotes that aren't reply-formatted

#### 3) Distinguish reply quotes from manual quotes
- Reply quotes follow pattern: `> **@username:** text` — render as Discord-style reply with arm
- Manual quotes (just `> some text` without the `@username:` pattern) — keep existing left-border style

### Visual Result
```text
Before:
 │ quoted text here
 actual reply text

After (Discord-style):
 ╭─ 🔵 username: quoted preview...
 actual reply text
```

### Files Changed
- `src/components/academy/RoomChat.tsx`

