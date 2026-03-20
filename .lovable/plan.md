

## Re-test Trade OS Onboarding Without Starting Over

### How it works
The onboarding gate is: `profile.onboarding_completed === false`. To re-trigger it, we just reset that flag in the database for your user.

### Plan
1. **Run a single SQL update** via the database migration tool to set `onboarding_completed = false` on your profile row
2. Optionally delete your `trader_dna` row so the onboarding seeds a fresh one
3. Navigate to `/academy/trade` (or the Trade OS cockpit route) — the onboarding will appear

### Alternative: Add a dev-mode "Reset Onboarding" button
If you want to re-test repeatedly without running SQL each time, I can add a small developer button (hidden behind admin/operator role) on the Settings page that resets `onboarding_completed` and deletes the `trader_dna` row.

### Recommendation
The quickest path is for me to just reset your flag now. Tell me which approach you prefer:
- **Option A**: I reset it for you right now (one SQL command)
- **Option B**: I build a "Reset Onboarding" dev button so you can re-trigger it anytime

