

# Remove Vault Status Gate from VAULT Approval Page

## What changes

Remove the Leak 2 fix — the vault status banner and the `vaultBlocked` logic that prevents saving plans when session is paused or vault is RED. Members should be able to check and save plans freely regardless of vault state.

## Changes in `src/components/vault-planner/VaultTradePlanner.tsx`

1. **Remove** the `vaultBlocked` variable (line 87-88)
2. **Remove** the vault status gate banner block (lines 268-282)
3. **Remove** `vaultBlocked` prop from `HeroDecisionCard` usage (line 515)
4. **Remove** `vaultBlocked` from `HeroDecisionCard` props type and all references inside it (lines 553, 561, 638, 642, 646)
5. **Keep** the `useVaultState` import and `vaultState` — it may be used elsewhere or useful later
6. **Remove** unused imports: `Pause`, `Ban`

No backend or database changes needed.

