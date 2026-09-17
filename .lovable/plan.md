# Read-Only Findings — Video Link Recovery + Deployment Inventory

Nothing was edited, deployed, published, or created. No data, UI, or configuration changed. (A roadmap file was not written because only this plan file may be created in this mode.)

---

# Part A — Video link recovery result

## Corrected counts (yours are right; my first table was wrong)

`academy_lessons`: 89 rows — 76 shown to members, 13 switched off. Linked: 50 (all among the 76 shown). Blank: 39 — 26 shown-but-blank, 13 switched-off-and-blank. My earlier per-chapter table folded hidden rows into the blank column.

## The Chapter 6, 7 and 8 links do not exist in any record I can read

I searched the full chat history (4,725 messages) for every title you listed and every form of YouTube link. Across the entire history only **two** lesson links were ever posted:

1. `https://youtu.be/lFMZyVBcvT8` — 2026-04-09 01:38: "Ok now add the video in it and here is the youtube link: https://youtu.be/lFMZyVBcvT8" → Chapter 2, "Vault OS Supply and Demand Indicator: Setup (Only)". Still in place.
2. `https://youtu.be/yGXIxEGEQRM?si=bFG4JeiRa849Hg3D` — 2026-04-04 00:43: "help me install a video inside chapter 10 - vault archive and do this: … and put in that and save it" → Chapter 10. Still in place.

Zero results for: "SSC", "Stock System v1.0", "options chain", "swing HTF", "timeframe framework", "trade plan mindset", "Combining Everything", "youtube.com/watch?v=", and every Chapter 6 / Chapter 7 lesson title. No migration file contains a lesson video link (the three matching "youtu" only define a `youtube` profile column). No blank lesson has a link in its notes. So there is nothing to recover for Chapter 6, Chapter 7, or the Chapter 8 bonus — those links were typed into the admin editor and never appeared in chat.

## Alternate sources checked

- Community chat posts contain four YouTube links, none tied to a lesson: `ojCwStIJASU`, `3Q7MTOHcIAc`, `V9bWGSQxu1I`, `O7skEgrWiJg`. Candidates only — I am not proposing them as fills.
- Toolkit items, live sessions, announcements: no YouTube links at all.
- Beginner Bridge is a copy of Chapter 2 lessons 7–14 with identical links; its two blanks are blank on both copies.

To fill Chapters 6, 7 and 8, paste the links (or the playlist) against the titles and I will apply them exactly.

---

# Part B — Deployment inventory

## 1. Staging database

No. There is exactly one Lovable Cloud backend for this project (instance size Tiny, region eu-west-1, not paused), and it serves both the preview and the published app. The app's own configuration points at that same single instance. Only one other project exists in your workspace (Appliance House OS) and it is unrelated. There is no staging or second database to promote through.

## 2. AI provider secrets and coach-chat status

Configured secret names (values never read or shown): `LOVABLE_API_KEY` (Lovable-managed), `APNS_BUNDLE_ID`, `APNS_KEY_ID`, `APNS_PRIVATE_KEY`, `APNS_TEAM_ID`, `CRON_SECRET`, `ECON_CALENDAR_REFRESH_SECRET`, `FINNHUB_API_KEY`, `FMP_API_KEY`, `GHL_API_KEY`, `GHL_LOCATION_ID`, `GIPHY_API_KEY`, `PUSH_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_VAULT_OS_MONTHLY_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SWEEP_CRON_TOKEN`, `SWEEP_PROTECTED_EMAILS`, `WHOP_API_KEY`.

There is no OpenAI, Anthropic, or Google AI key of your own — every AI feature routes through the Lovable AI gateway with the managed key. Six functions do so: `coach-chat`, `instant-answer`, `trade-focus`, `morning-brief`, `update-trader-dna`, `generate-avatar`.

**`coach-chat` is wired correctly but is currently failing.** All 46 AI requests in the last seven days returned HTTP 403 with reason `credit_hard_block_workspace`, and there were zero successes in that window. That is a workspace-level AI spending block, not a code or key fault: AI answers in the app will be erroring right now until credits or the workspace AI limit are raised by a workspace admin. This blocks any new AI feature too.

## 3. Deploying a new independent `atlas-chat` function

Technically yes: the connected environment deploys edge functions to the single live backend, and a new function can reuse the existing managed AI access with no new paid third-party account and no new provider key. Limitations:
- It would deploy straight to the live backend — there is no staging target, so it goes where members already are.
- It will return errors on every AI call until the workspace AI credit block in point 2 is cleared. Deploying it today would ship a non-functional chat.
- Any deploy syncs from the code in this environment. You said you hold newer local code that is not synced; deploying from here risks overwriting or diverging from it, so nothing should be deployed until that code is in place.

## 4. Android Firebase / google-services configuration

Not present. There is no `google-services.json` anywhere in the project, and no Firebase source file. The Android build is prepared for one but does not have it: `android/build.gradle` includes the `com.google.gms:google-services:4.4.4` classpath, and `android/app/build.gradle` applies the plugin only if `google-services.json` exists — otherwise it logs "google-services.json not found … Push Notifications won't work". `android/.gitignore` keeps the `google-services.json` line commented out, so the file is not being ignored — it simply was never added. Android push notifications therefore cannot work on a build made from this project as it stands. iOS push is configured separately through the APNS secrets listed above.

## Limitations of this report

- Secret values were never read; only names.
- AI gateway history is limited to the last seven days of retained logs, so I cannot say when calls last succeeded.
- I inspected only this project's files and backend; your unsynced local code was not visible to me.
