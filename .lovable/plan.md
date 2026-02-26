

## Plan: Generate 3 Community Chat Color Scheme Mockups

### Problem
The current dark blue (`hsl(215,28%,7%)`) chat background makes text hard to read. Message bubbles blend into the shell, reducing contrast and causing eye strain.

### Approach
Generate 3 mockup images using AI image generation, each showing the same chat layout with a different color system. You'll pick your favorite, then I'll implement it.

### The 3 Color Schemes

**Option A — "Slack Warm Gray"**
- Shell background: warm gray (#2B2D31 / #313338)
- Message area: slightly lighter gray (#383A40)
- Own bubbles: soft blue-gray
- Other bubbles: darker gray card
- Text: white/95% — high contrast
- Accent: Vault blue for links/buttons only
- Composer: lighter gray input bar (#4E5058)

**Option B — "iMessage Silver"**
- Shell background: cool silver-gray (#E5E5EA / #D1D1D6)
- Message area: light off-white (#F2F2F7)
- Own bubbles: Vault blue (#3B82F6) with white text
- Other bubbles: white cards with subtle shadow
- Text: dark charcoal on light, white on blue
- Composer: white input, blue send button

**Option C — "Telegram Matte Charcoal"**
- Shell background: deep charcoal (#1C1C1E / #212121)
- Message area: slightly warmer dark (#2C2C2E)
- Own bubbles: muted teal-green (#2B5B4F)
- Other bubbles: elevated dark card (#3A3A3C)
- Text: white/92% on dark
- Composer: medium gray input (#48484A)

### Steps
1. Generate 3 AI mockup images showing each scheme applied to the Vault Community chat layout
2. Present all 3 for your comparison
3. Implement the one you choose across `RoomChat.tsx`, `CommunityTradeFloor.tsx`, `TradeFloorHero.tsx`, `CockpitPanel.tsx`, `AcademyCommunity.tsx`, and `DateSeparator.tsx`

