# Atlas visual practice — local only

## Simplified replacement

The initial AtlasVisualLesson is no longer mounted in AtlasMentor. AtlasExample replaces it with one action at a time: reveal, pause/continue during candle playback, then another example. The initial three starter cards and playback-speed controls are removed. Welcome examples cycle through six authored scenarios (demand retest/failure, bullish/bearish structure, bullish response/failed bounce), with seeded variation in prices and candles. Chart-topic answers automatically use the matching visual topic. Demand boundaries come from base candle extrema; structure levels start at actual swing extrema and terminate at the first qualifying close. All visuals are marked simulated, not historical or unrestricted AI generation. Four replacement tests validate scenario invariants and component behavior; the production build passes.

## Previous iteration (superseded UI)

Added a visible New chat action that aborts a pending request, stops speech, clears this tab's conversation, and resets the chart lesson. Existing approved sources and course content are unchanged.

The welcome screen now includes an authored candlestick exercise with 5- or 15-second playback (excluding decision pauses). Students mark the demand base, watch the return, then reveal the response. An alternate failed-zone ending uses identical early candles. These are explicitly illustrative prices, not historical data or generated market predictions.

Chart-topic answers expose the exercise through Let me try. Pointer and keyboard marking, corrective feedback, replay, pause, optional browser narration, and reduced-motion manual steps are included. Closing the mentor or hiding the browser tab pauses playback.

Validation: Atlas guide/model and visual component tests pass; Vite build passes. Full TypeScript checking remains blocked by five pre-existing errors in AcademyProfileForm, UserProfileCard, TraderCockpit, and chartClassroom tests. No browser visual inspection was performed for this change.

The generative AI provider remains unconfigured. This change supplies a working authored visual exercise, not arbitrary question-specific AI animation generation. Nothing was pushed or deployed.
