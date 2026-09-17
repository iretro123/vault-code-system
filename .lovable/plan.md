# Mobile density and readability polish

## Goal
Make the existing Academy experience faster to scan and easier to read on 320–430px phones, while preserving tablet/desktop layouts, authentication, membership rules, backend behavior, media, and the validated native safe-area fixes.

## Changes
- Audit rendered Home, Learn/curriculum/player, Live, Community/messages, Settings, and Support/Coach layouts at the requested phone widths plus tablet and desktop.
- Tighten only oversized mobile spacing, feature areas, cards, and empty vertical space so useful actions appear sooner.
- Keep body, chat, and input text readable; improve line height, title wrapping, long-name handling, and 200% text enlargement behavior without globally shrinking type.
- Keep practical controls at least 44px where appropriate and preserve keyboard, dialog scrolling, bottom navigation, and lesson-action clearance.
- Leave desktop presentation and all business/data flows unchanged.

## Technical details
- Prefer scoped mobile media rules and existing classes/tokens over structural rewrites.
- Do not add decoration, animation, scroll interception, fixed content heights, or new product behavior.
- Extend focused source-level regression tests for mobile spacing, text sizing/wrapping, touch targets, dialog bounds, and bottom-navigation clearance.
- Verify with responsive browser screenshots, targeted tests, the full test suite, typecheck, and production build; commit the finished changes without publishing or submitting stores.

## Known limits
- Native XCTest and physical-device verification remain user-run.
- The 26 missing video URLs and runtime AI credit block remain unresolved and will not be concealed or modified.
