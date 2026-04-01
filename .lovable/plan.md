

## Expanded Emoji Reaction Picker

### Current State
- Only 3 reactions: 👍 🔥 💀 (with custom SVG icons for each)
- Hardcoded in `ALLOWED_EMOJIS` array
- Custom SVG files exist in `src/assets/emoji/` for those 3

### Answer: No DB or uploads needed
You do **not** need to upload PNGs to the database. We'll use **native Unicode emojis** for the expanded set — the same approach Discord uses. The existing 3 custom SVGs stay for the "quick reaction" bar, and the full picker uses native emoji characters which render on all devices.

### Plan

**1. Expand the emoji set — `src/hooks/useMessageReactions.ts`**
- Change `ALLOWED_EMOJIS` from a 3-item tuple to a larger list (~20-30 curated emojis) organized by category
- Keep the type flexible: `ReactionEmoji` becomes `string` so any emoji from the picker works
- The `getReactions` function already handles arbitrary emoji strings from the DB — just remove the filter that only shows `ALLOWED_EMOJIS`

**2. New emoji picker component — `src/components/academy/chat/EmojiReactionPicker.tsx`**
- A dropdown/popover triggered by a smiley-face button in the hover action bar
- Curated grid of ~30 emojis organized in categories (Smileys, Hands, Objects, Symbols)
- Example set: 👍 👎 ❤️ 🔥 💀 😂 😭 🤣 💯 🎯 💪 🙏 👀 🤝 💰 📈 📉 🚀 ⚡ 🧠 😤 🤔 😎 🥶 💎 🫡 ✅ ❌ 🎉 👏
- Clean dark-theme grid matching the existing UI
- Click an emoji → calls `toggleReaction(messageId, emoji)` → popover closes
- Renders native Unicode (no images needed for the expanded set)

**3. Update hover action bar — `src/components/academy/RoomChat.tsx`**
- Keep the 3 quick-reaction buttons (👍 🔥 💀 with SVG icons) in the hover toolbar
- Add a "+" or smiley-face button that opens the `EmojiReactionPicker` popover
- In the reactions row below messages, render the 3 SVG emojis with their icons and all others as native Unicode text
- Update the "add more reactions" hover area to use the picker instead of showing only the 3 missing emojis

**4. Update `renderReactionEmoji` function**
- If emoji is one of the 3 with custom SVGs → render the SVG icon
- Otherwise → render the native Unicode character (slightly larger for readability)

### Files
1. `src/components/academy/chat/EmojiReactionPicker.tsx` — new popover component
2. `src/hooks/useMessageReactions.ts` — widen emoji type, update `getReactions` to handle any emoji
3. `src/components/academy/RoomChat.tsx` — add picker trigger to hover bar, update reaction rendering

