

## Add Local Task Completion Logic to GameplanCard

**Scope:** Add toggleable local state for all tasks, update weekly progress to count only This Week + Consistency, and feed completions into Recently Completed. Same UI, no redesign.

### Changes — single file: `src/components/academy/dashboard/GameplanCard.tsx`

**1. Local completion state with localStorage persistence**

- Add a `completedMap` state: `Record<string, string>` mapping task ID → ISO timestamp
- Initialize from `localStorage` key `va_gameplan_completed`
- Persist on every change

**2. Toggle handler**

- Replace `handleTaskClick` with a toggle: clicking any task row flips its completed state in `completedMap`
- If marking complete → add `{ id: timestamp }` to map
- If unchecking → remove from map
- No navigation on click anymore (tasks are toggles, not links)

**3. Task `done` derived from local state**

- In the `useMemo` for groups, set each task's `done` from `completedMap[task.id]` existence
- Foundation tasks: still toggleable but use `completedMap` instead of `profile?.onboarding_completed`

**4. Weekly progress counts only This Week + Consistency**

- Change progress calculation (lines 132–135) to exclude Foundation group:
  ```
  const weeklyTasks = groups.filter(g => g.title !== "Foundation").flatMap(g => g.tasks);
  const doneCount = weeklyTasks.filter(t => t.done).length;
  const totalCount = weeklyTasks.length;
  ```
- Update progress text from `{pct}% complete` to `{doneCount}/{totalCount} complete`

**5. Recently Completed from local state**

- Derive from `completedMap`: collect all entries, sort by timestamp desc, take latest 5
- Map task ID back to title using a lookup from all groups
- Format date with `toLocaleDateString`
- Falls back to current mock data only if `completedMap` is empty

**6. Keep existing UI exactly**

- Same task row markup, same circle checkbox, same green completed styling, same progress bar, same section headers
- Only behavioral change: rows toggle instead of navigate

