

## Add Discord-style inline quote-reply to Community chat

### What changes

When a user right-clicks a message and selects "Reply", instead of opening the thread drawer, it will:
1. Show a **reply preview bar** above the composer (showing the quoted user's name + truncated message body, with an X to dismiss)
2. Focus the textarea so the user can type immediately
3. On send, prepend a quote block to the message body (e.g. `> @username: truncated text\n\nactual reply`) so the reply appears inline in the feed as a styled quote

### Implementation

**`src/components/academy/RoomChat.tsx`** — all changes in this one file:

1. **Add state** (~line 267 area):
   - `replyingTo: { id, user_name, body } | null` — tracks the message being replied to

2. **Update "Reply" menu action** (~line 834-837):
   - Instead of calling `onThreadOpen`, set `replyingTo` to the message and focus the textarea via `textareaRef.current?.focus()`

3. **Add reply preview bar** above the composer textarea (~line 1261, before the composer `<div>`):
   - A compact bar with: left blue accent border, `"Replying to {name}"` label, truncated body (40 chars), and an X button to clear `replyingTo`
   - Styled: `bg-[hsl(220,12%,90%)] border-l-2 border-l-primary rounded-lg px-3 py-2`

4. **Modify `handleSend`** (~line 342):
   - If `replyingTo` is set, prepend `> **@{user_name}:** {truncated body}\n\n` to the message body before sending
   - Clear `replyingTo` after send

5. **Update `renderPlainBody`** to detect and style quote lines:
   - Lines starting with `> ` render as a styled quote block with left blue border, smaller text, muted color — Discord-style

This keeps the thread drawer available for the hover toolbar button while making right-click Reply an inline quote-reply — faster and more Discord-like.

