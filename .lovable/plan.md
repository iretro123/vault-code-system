

## Fix: Wire up "Log Trade", "Ask Question", and "Share Win" composer buttons

The three template chips above the chat composer in the Trade Floor have no actions — "Log Trade" and "Ask Question" are `undefined`, so clicking them does nothing.

### Changes

**`src/components/academy/RoomChat.tsx`**
1. Import `useNavigate` from `react-router-dom`
2. Add `const navigate = useNavigate()` inside the `RoomChat` component
3. Update the chip actions array (lines 1240-1243):
   - `"Log Trade"` → navigates to `/academy/trade`
   - `"Ask Question"` → dispatches `toggle-coach-drawer` custom event
   - `"Share Win"` → already works via `onSwitchTab?.("wins")`, no change needed

