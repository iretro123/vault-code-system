

## Luxury Blue Halo Scrollbar for Chat

The chat feed (`RoomChat.tsx` line 759) uses native `overflow-y-auto` scrolling with browser-default scrollbar styling (grey/dark). Two changes needed:

### 1. `src/index.css` — Add a `.vault-chat-scroll` class
Custom scrollbar with blue halo styling:
- Thumb: `rgba(59,130,246,0.35)` (blue-500 at 35%) — hover brightens to 50%, active to 60%
- Track: `rgba(59,130,246,0.04)` — very faint blue glow
- Width: 6px, rounded, with padding for a floating feel

### 2. `src/components/academy/RoomChat.tsx` — Line 759
Add `vault-chat-scroll` class to the chat container's `overflow-y-auto` div so the custom scrollbar applies.

