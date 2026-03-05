

## Hide experience badges for leadership roles in chat

**Problem:** CEO, Admin, Coach, and Operator users currently show both their role badge (e.g. CEO crown) AND an experience badge (e.g. "Beginner"). This looks wrong — leadership shouldn't display "Beginner" or any experience level.

### Change

**`src/components/academy/RoomChat.tsx`** (line ~968-975):

Skip rendering `<ExperienceBadge>` when the user has a leadership academy role (CEO, Admin, Coach) — reuse the existing `isCeoOrAdmin` boolean which already covers all three:

```tsx
{msgProfile ? (
  <>
    <AcademyRoleBadge roleName={msgAcademyRole} />
    {!isCeoOrAdmin && (
      <ExperienceBadge role={getRoleBadgeKey(
        (msg as any).user_role,
        msgProfile?.role_level
      )} />
    )}
  </>
) : (
  <div className="h-4 w-16 rounded bg-[hsl(220,10%,88%)] animate-pulse" />
)}
```

This means CEO/Admin/Coach users only show their role badge; regular members continue showing their experience level.

### Files modified
- `src/components/academy/RoomChat.tsx`

