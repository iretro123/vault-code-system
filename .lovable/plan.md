

## Fix: Remove background highlight from @mentions

The `bg-white/20` and `bg-primary/10` backgrounds create the pill/highlighter effect visible in the screenshot. Mentions should just be bold colored text without a background box.

### Change

**File: `src/components/academy/RoomChat.tsx` (line 184)**

Remove `bg-white/20 rounded px-0.5` and `bg-primary/10 rounded px-0.5` from the mention spans. Keep only the text color and font weight:

- Own bubble: `"text-white font-semibold"`
- Other bubble: `"text-primary font-semibold"`

Single line change.

