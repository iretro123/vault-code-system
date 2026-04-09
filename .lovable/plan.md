
Fix the curriculum data without undoing the rest of the app.

What I found:
- Your old Chapter 2 content is still there.
- It was not actually deleted from the lessons table.
- The mistake was that a brand-new top-level module was inserted at sort order 2, which pushed the real Chapter 2 down to slot 3.
- That new module has 0 lessons, which is why you now see an empty Module 02 card.

Plan:
1. Restore the real Chapter 2
   - Move `Chapter 2 — Setup & Beginner Bridge` back to `sort_order = 2`.
   - Keep its existing slug and all current lesson/video rows intact.

2. Remove the accidental standalone module
   - Delete the extra top-level module row:
     `Vault OS Supply and Demand Indicator: Setup (Only)`
   - This removes the empty card from the Learn page.

3. Add the new content inside Chapter 2 instead
   - Insert a new lesson under the existing Chapter 2 slug (`risk-management`).
   - Lesson title: `Vault OS Supply and Demand Indicator: Setup (Only)`
   - Put the TradingView install link in the lesson notes/description:
     `https://www.tradingview.com/script/S5XeIM2m-Vault-Trading-Academy-Supply-And-Demand/`
   - Place it in the Chapter 2 lesson order near the TradingView setup lessons so it feels intentional.

4. Clean up lesson ordering
   - Normalize Chapter 2 lesson `sort_order` values so the sequence is clean and the new lesson appears in the right place.

5. Refresh cached learn data
   - Clear/refetch the local cached module/lesson data so users immediately see the corrected Chapter 2 instead of stale wrong ordering.

Technical detail:
- This app currently supports `modules -> lessons`, not true nested subsection headings inside a module.
- So the fastest correct fix is:
  - keep Chapter 2 as the module card
  - add “Vault OS Supply and Demand Indicator: Setup (Only)” as a lesson inside that chapter
- If you later want visible subsection headers inside a chapter, that would be a separate schema/UI enhancement.

Targets:
- `academy_modules` data: reorder and remove mistaken module row
- `academy_lessons` data: insert the new Chapter 2 lesson and resequence
- Possibly `src/hooks/useAcademyModules.ts` / `src/hooks/useAcademyLessons.ts` only if cache invalidation needs tightening

Expected result:
- The Learn page shows the original Chapter 2 card back in position 2
- All previous Chapter 2 videos remain there
- The new Supply & Demand setup item appears inside Chapter 2 where it belongs
- No empty replacement module card
