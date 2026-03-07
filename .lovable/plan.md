

## Redesign: iOS-Style Messaging for Inbox Thread View

### Current State
The thread view uses plain rounded boxes with no avatars next to messages, inconsistent styling, and no visual distinction between sender/receiver. It looks like a basic log, not a messaging app.

### Design Target
iMessage-inspired dark theme: clean bubbles with tails, profile photos beside each message, proper grouping, and a polished header.

### Changes — Single File: `src/components/academy/InboxDrawer.tsx`

**A. Header Redesign**
- Show RZ avatar (32px) + name + CEO badge in the header bar
- Subtle separator line below

**B. Message Bubbles — iOS Style**
- **Admin messages (left-aligned):** Blue-tinted bubble (`bg-[#1C3A5F]`), RZ avatar (28px) to the left of each message group
- **User messages (right-aligned):** Darker neutral bubble (`bg-white/[0.10]`), user initials avatar (28px) to the right
- Bubble corners: iOS-style asymmetric rounding — `rounded-2xl` with `rounded-bl-sm` for admin, `rounded-br-sm` for user (tail side)
- Consecutive messages from same sender: collapse avatar (show only on first), tighter vertical gap (4px vs 12px)
- Timestamps: smaller (10px), muted, shown below each message

**C. Input Bar**
- Rounded pill-style input matching iOS aesthetic
- Send button as a filled circle with arrow icon
- Subtle top border

**D. Original welcome message**
- Render as the first admin bubble in the same style (not a separate card format)
- Seamlessly integrates with the thread history

No other files change. The `SenderAvatar`, `AcademyRoleBadge`, and `useThreadMessages` all stay as-is.

