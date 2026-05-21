import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import { COMMUNITY_TERMS_COPY } from "@/lib/communitySafety";

type CommunityTermsDialogProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  compact?: boolean;
};

export function CommunityTermsDialog({ checked, onCheckedChange, compact = false }: CommunityTermsDialogProps) {
  const [open, setOpen] = useState(false);
  const [draftChecked, setDraftChecked] = useState(checked);

  const openTerms = () => {
    setDraftChecked(checked);
    setOpen(true);
  };

  return (
    <>
      <div
        className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] cursor-pointer group hover:border-primary/25 transition-colors"
        onClick={openTerms}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`rounded-xl flex items-center justify-center shrink-0 ${checked ? "bg-emerald-500/15" : "bg-white/[0.05]"} ${compact ? "h-9 w-9" : "h-10 w-10"}`}>
              {checked ? <ShieldCheck className="h-5 w-5 text-emerald-400" /> : <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary" />}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">Terms of Use & Community Safety</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {checked ? <span className="text-emerald-400/90 font-medium">Accepted</span> : "Required before signing in or creating an account"}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant={checked ? "ghost" : "outline"}
            size="sm"
            className="shrink-0 text-xs rounded-lg h-8 px-3 font-semibold"
            onClick={(event) => { event.stopPropagation(); openTerms(); }}
          >
            {checked ? "View" : "Review"}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-lg w-full !max-h-[85dvh] p-0 gap-0 border-white/[0.08] bg-[hsl(220,20%,8%)] rounded-2xl overflow-hidden !flex !flex-col">
          <DialogTitle className="sr-only">{COMMUNITY_TERMS_COPY.title}</DialogTitle>
          <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
                <ShieldAlert className="h-5.5 w-5.5 text-primary" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-foreground tracking-tight">{COMMUNITY_TERMS_COPY.title}</h2>
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">Version {COMMUNITY_TERMS_COPY.version}</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]" style={{ touchAction: "pan-y" }}>
            <div className="px-4 sm:px-6 py-4 bg-black/20">
              <div className="text-[11.5px] leading-[1.75] text-muted-foreground/90 space-y-4">
                <p className="text-[13px] font-bold text-foreground tracking-tight uppercase">Vault OS End User Terms and Community Rules</p>

                <div>
                  <p className="font-semibold text-foreground mb-1">1. No tolerance for objectionable content or abusive users</p>
                  <p>Vault OS is a member trading education community. We do not tolerate harassment, threats, hate speech, sexual content, spam, scams, abusive behavior, or any objectionable content.</p>
                </div>

                <div>
                  <p className="font-semibold text-foreground mb-1">2. User-generated content</p>
                  <p>Members may post chat messages, trade screenshots, questions, wins, profile content, and attachments. You are responsible for what you post and must only share lawful, respectful, trading-related content.</p>
                </div>

                <div>
                  <p className="font-semibold text-foreground mb-1">3. Filtering, reporting, and blocking</p>
                  <p>Vault OS may filter objectionable content before it is posted. Members can report objectionable messages and block abusive users from the message menu. Blocking removes that user's messages from your feed immediately and sends a report to the Vault OS moderation team.</p>
                </div>

                <div>
                  <p className="font-semibold text-foreground mb-1">4. Moderator action within 24 hours</p>
                  <p>Vault OS reviews objectionable content reports within 24 hours. We may remove content, time out, ban, or eject users who post abusive or objectionable content.</p>
                </div>

                <div>
                  <p className="font-semibold text-foreground mb-1">5. Trading education disclaimer</p>
                  <p>Vault OS provides education, community, journaling, and discipline tools. It does not guarantee trading profits, success, or financial outcomes. Users are responsible for their own trading decisions and risk.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-6 py-4 sm:py-5 border-t border-white/[0.06] bg-white/[0.02] space-y-3 sm:space-y-4 shrink-0">
            <div className="flex items-start gap-3 rounded-xl bg-white/[0.04] border border-white/[0.08] p-3">
              <Checkbox
                id="community-terms-modal"
                checked={draftChecked}
                onCheckedChange={(value) => setDraftChecked(value === true)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label htmlFor="community-terms-modal" className="text-[11.5px] leading-[1.55] text-foreground/70 cursor-pointer select-none">
                I agree to the Vault OS Terms of Use and Community Safety rules, including zero tolerance for objectionable content and abusive users.
              </label>
            </div>
            <Button
              type="button"
              className="w-full h-11 text-sm font-semibold rounded-xl"
              disabled={!draftChecked}
              onClick={() => { onCheckedChange(true); setOpen(false); }}
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Accept & Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
