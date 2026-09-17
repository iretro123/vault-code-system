# Atlas — local mentor implementation

Updated: the Astra engine and production-gated endpoint are now also implemented. See `atlas-release-gates.md` for the authoritative current rollout status and remaining prerequisites. Nothing is deployed.

## What works now

- Local Ask Coach opens the Atlas dialog; the production UI remains the legacy CoachDrawer.
- Ten authored learning topics, plain-language follow-ups, one-question practice with corrective feedback, and the existing demand chart.
- The local examples are explicitly labeled authored, not generative AI. Unknown questions receive an honest limitation message.
- Opt-in speech through browser SpeechSynthesis. Only voices with `localService === true` and English locale are selected. No microphone, remote voice fallback, cloned voice, or automatic playback. Stop, close, and new conversation cancel playback. Voice quality varies by device.
- Tab-local, signed-in-user-scoped history (last 30 turns); no chat records are saved to Supabase by Atlas.
- Existing human-coach ticket UI is still accessible. Its local writes stay blocked by the existing guard. Atlas does not send a ticket automatically.
- The old CoachDrawer fetch now uses the shared preview guard as well, closing the audited direct-fetch bypass.

## Actual generative connection path

`scripts/atlasDevMentor.ts` is a Vite development-only proxy at `/__atlas`. It is not a deployed Supabase function. It never reads or writes production student records and does not call the old coach-chat function.

Without `ATLAS_API_KEY`, status reports `configured:false` and generation returns 503. The local interface stays in guided mode. No key was configured or requested from production secrets during this task.

To enable Astra, provide a dedicated OpenAI test project key as server-only `ATLAS_OPENAI_API_KEY`. The adapter targets `gpt-6-astra` at high reasoning. An explicitly configured `ATLAS_API_KEY` retains the earlier Lovable option. Never prefix secrets with `VITE_`, commit a secret, or paste a key into chat. Restart the local development server afterward. Provider availability has not been verified with a real key. This does not switch the Codex model or train a new foundation model.

The proxy enforces loopback Host, same-origin JSON POST, a 32KB body cap, bounded context, two concurrent requests, 20 requests/minute, and a 55-second upstream timeout. Astra has a 5,000 output-token cap including reasoning; the Lovable adapter has a 1,600-token cap. Unknown reference/action IDs and malformed practice checks are rejected. These are local development controls, not production user authorization.

The server uses up to six authored teaching references, not full Vault transcripts. The UI explicitly says this. Course videos/PDF are not indexed or represented as learned. There is no live pricing feed, screenshot analysis, trade execution, or guaranteed advice.

## Before a public release

1. Verify the test gateway/model with actual conversations and evaluate accuracy, cost, latency, interruptions, citations, and uncertainty. The generative path has not been exercised against a live provider.
2. Ingest approved lesson transcripts and PDF text with real IDs/timestamps/pages; enforce content entitlements during retrieval. Test OCR of the PDF rather than assuming readable text exists.
3. Add production authentication, per-member distributed quotas, privacy/retention controls, and prompt-injection evaluation. Do not expose this local proxy on a public server.
4. Only then choose a real-time microphone/cloud voice service, obtain microphone permission and communicate any audio processing/retention. This version is spoken replies, not a two-way voice call.
5. Validate mobile keyboard behavior and screen-reader flow on real devices, plus qualitative voice playback. Browser controls were exercised here; perceived voice naturalness was not graded.

## Verification

- Six tests cover topic/follow-up behavior, honest fallback, practice metadata, malformed roles, long conversation handling, and rejecting invented references/actions.
- Browser tested: open, demand exercise, wrong-choice explanation, simpler follow-up, Listen starts, Stop stops.
- Vite production build passes. Existing unrelated TypeScript errors remain in profile/cockpit and earlier chart tests; no new Atlas TypeScript errors were observed.
- Sites build helper encounters the repository's pre-existing lockfile/package-manager conflict; original Vite build used without altering lockfiles.

References: [MDN local speech voices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), [OIC options basics](https://www.optionseducation.org/optionsoverview/options-basics), [FINRA stop orders](https://www.finra.org/investors/insights/stop-orders-factors-consider-during-volatile-markets).
