import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Shown when account status could not be verified yet. Never shows member content. */
export function AccessCheckRetry({ onRetry }: { onRetry: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  return (
    <main className="academy-top-safe min-h-[100dvh] w-full flex items-center justify-center bg-background px-5">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-7 text-center shadow-lg">
        <h1 className="text-xl font-semibold text-foreground">We couldn't check your account</h1>
        <p className="mt-3 text-sm text-muted-foreground">Check your connection and try again.</p>
        <div className="mt-6 flex flex-col gap-3">
          <Button size="lg" className="w-full gap-2" disabled={busy} onClick={async () => { setBusy(true); try { await onRetry(); } finally { setBusy(false); } }}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Try again
          </Button>
          <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground" onClick={() => void supabase.auth.signOut()}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </section>
    </main>
  );
}
