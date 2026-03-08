

## Fix: AI Avatar Generation Not Working

### Problem
The edge function `generate-avatar` uses `supabase.auth.getClaims(token)` (line 45) which is **not a valid method** in the Supabase JS client. This causes a silent 401 error, so the function never reaches the AI generation step. The frontend invocation fails and the user sees no preview.

### Solution

**`supabase/functions/generate-avatar/index.ts`** — Replace the `getClaims` auth check with `supabase.auth.getUser()`:

```typescript
// Replace lines 44-52:
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
const userId = user.id;
```

That's the only change needed. The rest of the function (AI call, upload, return URL) and the frontend code are correct.

### Why this fixes both issues
- The "Generate Avatar" button will now successfully call the AI model and return an image
- The preview will display because `setAiPreviewUrl(url)` runs on success, which triggers the `renderAvatar()` image path

