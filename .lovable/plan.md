

# Smart Refresh System — Wake & Reconnect

## Problem
Currently `refetchOnWindowFocus: false` is set globally, and there's no centralized wake/reconnect logic. When a user closes their laptop lid or loses WiFi and comes back, the app shows stale data — old trade entries, outdated chat messages, wrong unread counts — until they manually navigate or refresh.

## How It Works (Discord-style)

Create a single `useSmartRefresh` hook mounted once in `AcademyLayout` that listens for two events:
1. **Tab becomes visible** (`visibilitychange`) after being hidden for 60+ seconds
2. **Network comes back online** (`online` event)

When either fires, it:
- Invalidates all React Query caches (triggering background refetches for mounted queries)
- Reconnects Supabase realtime channels that may have gone stale
- Re-fires the presence heartbeat immediately
- Shows a brief toast: "Syncing..." → auto-dismisses

## Implementation

### 1. New hook: `src/hooks/useSmartRefresh.ts`

```typescript
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STALE_THRESHOLD = 60_000; // 60s — only refresh if hidden that long

export function useSmartRefresh() {
  const queryClient = useQueryClient();
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    const refresh = () => {
      queryClient.invalidateQueries();              // background refetch all
      supabase.realtime.setAuth(/* current token */); // reconnect channels
      toast.info("Syncing...", { duration: 2000, id: "smart-refresh" });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      } else if (document.visibilityState === "visible") {
        const elapsed = hiddenAtRef.current 
          ? Date.now() - hiddenAtRef.current 
          : 0;
        if (elapsed >= STALE_THRESHOLD) refresh();
        hiddenAtRef.current = null;
      }
    };

    const onOnline = () => refresh();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
  }, [queryClient]);
}
```

### 2. Mount in AcademyLayout

Add `useSmartRefresh()` call in `AcademyLayoutInner`, next to the existing `usePresenceHeartbeat()`.

### 3. Keep existing QueryClient config

`refetchOnWindowFocus: false` stays — we handle it ourselves with the 60s threshold instead of React Query's aggressive every-focus refetch.

## What This Fixes
- Laptop lid close/open → all data refreshes automatically
- WiFi drop/reconnect → immediate sync
- Supabase realtime channels reconnect after sleep
- No unnecessary refetches for quick alt-tabs (60s threshold)

