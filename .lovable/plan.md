

## Plan: Trading OS — Priority Fix Implementation (All 3 Phases) — COMPLETED

### Phase A: Functional Trust ✅
- **QuickCheckInSheet**: Now inserts into `journal_entries` on submit with `userId` prop, loading state, double-submit prevention
- **NoTradeDaySheet**: Now inserts into `journal_entries` on submit with `userId` prop, reason mapped to `biggest_mistake`
- **AcademyTrade**: Passes `userId={user?.id}` to both sheets; mount query includes `todayTradeCount` dependency for correct `in_progress` detection

### Phase B: True Workflow ✅
- **Today's Budget card**: Added to Plan stage top — shows Daily Risk, Per Trade Max, Trades Allowed from vault_state
- **Execution moment**: Live stage has "Mark Executing" → "Close & Log" flow with duration timer and Planned/Executing badge
- **Session enforcement**: SessionSetupCard exports `onPhaseChange` callback; cutoff/closed phases show amber/red warning banners
- **Cutoff override**: Logging after cutoff shows "Override: Log After Cutoff" button; notes marked with `⚠️ Logged after cutoff`
- **Stage guidance**: Each stage has italic guidance line ("Set your budget, build a plan..." etc.)
- **CTA consolidation**: Review stage has single primary "Complete Check-In" CTA; removed duplicate "Log a Trade" from review
- **TodaysLimitsSection**: Updated to `border-white/[0.06] bg-white/[0.02]` luxury styling

### Phase C: Usability & Mobile ✅
- **Right rail hidden on mobile**: `hidden md:block` on right session rail
- **Welcome Hero Log button**: Hidden on mobile (`hidden md:flex`)
- **OSTabHeader**: Icon-only on mobile (no label text), increased touch target
- **VaultTradePlanner**: Decision framing copy added below coaching note — FITS/TIGHT/PASS explained in plain English
