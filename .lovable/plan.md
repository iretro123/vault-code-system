# Lesson Video Audit — Findings and Recovery Plan

Read-only investigation. Nothing was changed: no lessons edited, no links added, no covers touched, nothing published.

## 1. What the live library actually contains

Total lessons: 89. Linked: 63. Blank: 26.

| Chapter (module) | Lessons | Blank | Shown to members with a video |
| --- | --- | --- | --- |
| Chapter 1 — Beginner Bridge (basic only) | 10 | 2 | 8 |
| Chapter 1 — Vault Install (Start) | 9 | 8 | 1 |
| Chapter 2 — Setup & Beginner Bridge | 10 | 2 | 8 |
| Chapter 3 — Market Structure & Chart Foundations | 12 | 2 | 10 |
| Chapter 4 — Supply & Demand with Vault Blocks | 10 | 2 | 8 |
| Chapter 5 — Confirmations, Entries & Execution | 7 | 2 | 5 |
| Chapter 6 — Execution Playbooks | 10 | 10 | 0 |
| Chapter 7 — Trader OS | 11 | 10 | 1 (mentorship, restored) |
| Chapter 8 — Backtesting Lab | 6 | 1 | 5 |
| Chapter 9 — Coaching Replays | 3 | 0 | 3 |
| Chapter 10 — Vault Archive | 1 | 0 | 1 |

Chapters 2 and 3 are **not** empty — every visible lesson there has a working link.

## 2. Why Chapters 1–3 look like "no video" in the app

Three separate causes, all confirmed by reading the data and the page code:

1. **Chapter 1 (Vault Install)** genuinely has only one video: "Welcome to Vault" (`M1HmyrUYpzw`). The other 8 lessons are blank *and* switched off, so a member effectively sees a single-lesson chapter.
2. **Free/basic or shared guest accounts** only ever see the Beginner Bridge chapter — Chapters 1, 2, 3 are filtered out of the course list entirely for those accounts. If the account used for testing is basic/guest, "Chapters 1–3 missing" is expected behaviour, not lost data.
3. **Preview-domain playback**: the video player always tells YouTube the page origin is `member.vaulttradingacademy.com`. When the app is opened on the preview address instead, YouTube can refuse to play and show an error/blank frame even though the link is correct. A locally cached copy of the lesson list (saved in the browser) can also keep showing an older, link-less version until the browser storage is cleared.

## 3. Where the original links live — and don't

- The backend history files contain **no lesson video links at all** (verified across every migration). Lesson links were always typed in through the admin editor, so there is no historical snapshot of them in the codebase.
- The Beginner Bridge chapter is a copy of Chapter 2's lessons 7–14 and carries the identical links, so those eight are fully recoverable from each other.
- For the remaining blanks the only possible source is the chat history where you previously supplied YouTube links. A first pass found the Chapter 10 archive link and the Chapter 2 "Supply and Demand Indicator" link discussed there, but not a full list. A full recovery needs a deeper sweep of that history.

## 4. Verified links (unchanged, for your records)

Chapter 1 — Vault Install
- Welcome to Vault (What This Is / What This Is Not) — `1ae00cf4-a2a7-4226-ad10-8e719e1c5415` — https://youtu.be/M1HmyrUYpzw

Chapter 2 — Setup & Beginner Bridge (identical set also on Beginner Bridge)
- TradingView Setup + Alerts PT.1 — `3071c4cd-c0f4-4b96-99d0-b423d0a02eac` — https://youtu.be/QqSeDPpJY0Q
- TradingView Setup + Alerts PT.2 — `3f867e37-ea09-44ba-ae17-3074e6f95d28` — https://youtu.be/-0SdQkaP87U
- Vault OS Supply and Demand Indicator: Setup — `7d352557-a9ec-4a3a-9f52-be26563938fd` — https://youtu.be/lFMZyVBcvT8
- How to Practice on TradingView — `316ed709-6125-4cd4-b91c-afd497dd019e` — https://youtu.be/dna1Ok7Ej0g
- How to Pick Stocks to Trade — `efd5a653-29ae-4b3d-915e-58e56965707b` — https://youtu.be/I-k63hcMPOY
- Indicators: What to Use — `b332fea8-383c-477f-b580-886932e333cb` — https://youtu.be/TKWK4hEtvIw
- Options Basics — `90765680-e318-44e5-8675-f4be246d558d` — https://youtu.be/2-n7N0PSec8
- How To Mark Up Charts for Beginners — `407b0a79-be3f-4df8-86de-cf78e6c16695` — https://youtu.be/r1gwHAhj8ak

Chapter 3 — Market Structure & Chart Foundations
- Step-by-Step Chart Markup — `21e7eb31-bc7b-4a4f-a62c-e10b560bd75a` — watch?v=DAWv527aYqg
- How to Spot Trends + Trade It — `3fc0736d-08a4-4241-84bf-ce9e3dbfd6e5` — https://youtu.be/rDV2VTftrIg
- Vault Blocks EP.1 — `47b57e2c-39b7-4f42-ae2c-2639ded2caa7` — watch?v=5HvhX60tWRw
- Vault Blocks EP.2 — `17adc5f2-6d0f-483f-96be-cd56f8935039` — watch?v=PxnKSUZgK6Q
- Vault Blocks EP.3 — `8264f3b5-4339-4282-9a56-fcf47885f46c` — watch?v=aFvEdLMjsA0
- Vault Blocks EP.4 — `dd650152-2ca3-44c7-b99e-bb378f87d94c` — https://youtu.be/rEvHmM1dSN8
- Vault Blocks EP.5 — `721ce904-b09e-4849-bc6a-ea6a16a22510` — https://youtu.be/agy0YXscOqw
- Vault Blocks EP.6 — `9323f4b6-8442-4c72-b10f-79a4602d7f46` — https://youtu.be/YuoaV8MiGLQ
- The Approach (Structure Confusion Fixed) — `309f7fcd-cf30-4e39-8923-4d9365922041` — https://youtu.be/SvD0cEBAOsw
- BONUS: Common Structure Mistakes — `5405ef9f-d33b-4926-8440-de231aed8077` — https://youtu.be/qFAtEIPiaDQ

## 5. The 26 blank lessons

Chapter 1 — Vault Install (all currently switched off): How to Use Vault Academy; Pick Your Trader Lane; The Truth: Why Most Traders Lose; The Vault Method in 3 Steps; How to Learn Here Without Overwhelm; Your First 30 Days in Vault; Next Step: Beginner Bridge or Fast Pass; BONUS: How Profitable Traders Are Built.

Chapter 2 and Beginner Bridge (switched off, duplicated pair): What Is the Stock Market? (March 21st); How to Setup Your First Brokerage (March 21st).

Chapter 3: Chapter Intro: Why Structure Comes Before Setups (off); Market Structure Notes Walkthrough (VB PDF).

Chapter 4: 5 Confirmations Board (Miro Walkthrough); Chapter Wrap: What to Combine With S&D Next.

Chapter 5: Chapter Intro: The Entry Is Earned, Not Forced; Execution Recap.

Chapter 6 (all ten): Chapter Intro: One Framework, Different Styles; Beginner Starter: How to Day Trade with SSC; Framework to Day Trade + Timeframes; How to Enter Signals & Create Your Own Signals; Swing Trading (SSC) HTF Only; Stock System v1.0; Options Chain Basics + Strike Selection; Options Risk Framing with Vault Rules; How to Create a Trade Plan; Which Playbook You Should Use.

Chapter 7 (ten, mentorship excluded): Chapter Intro: Results Come From Behavior; Trading Mindset + EMAs + SnD Secrets; Trade Plan + Mindset; Mindset Hack / Waiting for the Setup / Rules; plus the remaining lessons in that chapter.

Chapter 8: BONUS: All In One — Combining Everything.

## 6. Proposed next steps (nothing runs until you approve)

1. Deep sweep of the full chat history for every YouTube link you ever posted, grouped by the chapter and lesson title it was posted against, and produce a link-by-link match list with a confidence note on each. No guessing, no loosely related substitutes.
2. Hand you that list for confirmation before a single lesson is filled in.
3. Separately, confirm which account you were testing with. If it was a free/basic account, Chapters 1–3 are hidden by design and no data is lost.
4. Optional follow-up, only if you want it: make the video player use the address the app is actually being viewed on, so lesson videos also play on the preview address, and drop the saved local copy of the lesson list so newly added links appear immediately.

## Technical notes

- `academy_lessons` holds 89 rows; 26 have empty `video_url`. All non-empty values parse cleanly against the ID pattern in `src/lib/videoEmbeds.ts`, so no malformed-link cases exist.
- No migration under `supabase/migrations` contains a lesson `video_url`; the three files matching "youtu" only reference a `youtube` profile column.
- `src/lib/videoEmbeds.ts` hardcodes `origin=https://member.vaulttradingacademy.com` for the nocookie embed, which is a plausible source of blank/refused frames on non-production hosts.
- `useAcademyLessons` seeds state from `localStorage` (`va_cache_lessons[_slug]`) before the network fetch resolves, so a stale cache renders link-less rows first.
- `AcademyLearn` restricts basic/guest accounts to `chapter-1-basic-bridge` only; `AcademyModule` additionally hides `visible = false` lessons from non-managers.
