

## Improve Text Readability — Match Discord-Level Font Sizes

### Problem
The app uses tiny font sizes across chat, learn, and community pages. Discord uses **15px** for message body, **14px** for usernames, and **12px** for timestamps. Our app currently uses **13–14px** for messages (13px on desktop), **13px** for usernames, **11px** for timestamps, and **11–12px** for community tabs. This makes everything feel cramped and hard to read.

### Changes

#### 1. Chat message body — bump to 15px
**File: `src/components/academy/RoomChat.tsx`**
- Line 1429: `text-[14px] md:text-[13px]` → `text-[15px]` (matches Discord exactly)
- Line 1346: Official announcements `text-sm` → `text-[15px]`
- Line 1419: Official body `text-[15px]` — already correct, keep
- Line 1358: Deleted message `text-[13px]` → `text-[14px]`

#### 2. Chat usernames — bump to 14px
**File: `src/components/academy/RoomChat.tsx`**
- Line 1308: `text-[13px]` → `text-[14px]` for username display

#### 3. Chat timestamps — bump to 12px
**File: `src/components/academy/RoomChat.tsx`**
- Line 1331: `text-[11px]` → `text-[12px]` for message timestamps
- Line 1295: hover timestamp `text-[10px]` → `text-[11px]`

#### 4. Chat composer — keep 16px mobile, bump desktop to 15px
**File: `src/components/academy/RoomChat.tsx`**
- Line 1811: `md:text-[14px]` → `md:text-[15px]`

#### 5. Quote/reply text — bump to 13px
**File: `src/components/academy/RoomChat.tsx`**
- Line 295: reply connector `text-[12px]` → `text-[13px]`
- Line 305: blockquote `text-[12px]` → `text-[13px]`

#### 6. Community tabs — bump to 13px
**File: `src/pages/academy/AcademyCommunity.tsx`**
- Line 72: `text-[11px] md:text-[12px]` → `text-[12px] md:text-[13px]`

#### 7. Learn page — bump lesson count and progress text
**File: `src/pages/academy/AcademyLearn.tsx`**
- Line 284: lesson count `text-xs` → `text-[13px]`
- Line 288: progress percent `text-xs` → `text-[13px]`

#### 8. Global base font size
**File: `src/index.css`**
- Add `font-size: 15px` to the `html` selector so `rem`-based components (buttons, form inputs, labels) all scale up slightly. This single change lifts the baseline for every `text-sm` (14px → ~14.6px) and `text-base` (16px → ~16.5px... actually this would break things).
- **Better approach**: Skip global base change. Instead, target the specific small text classes in the key pages above.

### What this does NOT touch
- Dashboard cards, admin panels, settings — those are fine at current sizes
- `text-[10px]` labels used for badges, metadata, and decorative elements — intentionally small
- Trade OS page — already has its own sizing system

### Expected result
Chat messages, usernames, timestamps, tab labels, and learn page text all bump up 1–2px to match Discord's comfortable reading size. No layout breakage — these are all inline text changes.

