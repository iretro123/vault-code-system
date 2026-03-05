

## Update CEO badge: purple label + gold crown

**Change:** Update the CEO badge in `src/components/academy/AcademyRoleBadge.tsx` to use a purple background/text with a gold/yellow Crown icon for better contrast in the light community chat.

**Current:** `bg-amber-500/20 text-amber-400 border-amber-500/30` (amber on amber — washes out on light backgrounds)

**New:**
- Badge: `bg-purple-500/20 text-purple-600 border-purple-500/30` — purple tint, readable on both dark and light surfaces
- Crown icon: explicit `text-yellow-500` color override so it pops as a gold crown against the purple badge

```tsx
CEO: {
  label: "CEO",
  icon: Crown,
  cls: "bg-purple-500/20 text-purple-600 border-purple-500/30",
  iconCls: "text-yellow-500",
},
```

Add an optional `iconCls` field to the config and apply it to the `<Icon>` element so the crown renders gold while the label text stays purple.

**File:** `src/components/academy/AcademyRoleBadge.tsx`

