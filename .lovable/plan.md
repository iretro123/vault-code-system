

# Remove Title for SMS + Auto-personalize Templates

## Changes

### 1. Hide Title field when SMS channel is selected
**File: `src/components/admin/AdminBroadcastTab.tsx`**
- Wrap the Title input (lines 382-388) in a condition: only show when `channel !== "sms"`
- Update `handleSend` validation (line 133): skip `title` requirement when channel is `"sms"`, require `body` instead
- Update `executeSend` SMS path (line 151-153): send just `body.trim()` as the message (no title concatenation)
- Update send button disabled check (line 416): when SMS, check `body` not `title`

### 2. Auto-prepend `{{name}}` to templates
**File: `src/components/admin/AdminBroadcastTab.tsx`**
- Update `applyTemplate` (line 126-128): when applying a template, prefix the body with `Hey {{name}}, ` so personalization is automatic
- Template bodies become e.g. `"Hey {{name}}, time to review your week..."`

### Files Changed
- **Edit**: `src/components/admin/AdminBroadcastTab.tsx`

