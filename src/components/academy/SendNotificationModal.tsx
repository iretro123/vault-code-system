import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendNotificationModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: string;
  defaultTitle?: string;
  defaultBody?: string;
  defaultLinkPath?: string;
}

const TYPE_OPTIONS = [
  { value: "announcement", label: "Announcement" },
  { value: "new_module", label: "New Module" },
  { value: "motivation", label: "Motivation" },
];

export function SendNotificationModal({
  open,
  onClose,
  defaultType = "announcement",
  defaultTitle = "",
  defaultBody = "",
  defaultLinkPath = "",
}: SendNotificationModalProps) {
  const [type, setType] = useState(defaultType);
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState(defaultBody);
  const [linkPath, setLinkPath] = useState(defaultLinkPath);
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const handleSend = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSending(true);
    const { error } = await supabase
      .from("academy_notifications" as any)
      .insert({
        user_id: null, // broadcast
        type,
        title: title.trim(),
        body: body.trim(),
        link_path: linkPath.trim() || null,
      } as any);
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Notification sent to all students");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[4px]" onClick={onClose} />
      <div className="relative w-[min(500px,calc(100vw-48px))] rounded-xl border border-white/[0.08] bg-[linear-gradient(180deg,#0E1218_0%,#0A0E14_100%)] shadow-[0_12px_48px_-8px_rgba(0,0,0,0.6)] p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Send Notification</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full h-11 rounded-lg border border-white/[0.08] bg-white/[0.04] text-foreground text-sm px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0E1218] text-foreground">{o.label}</option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="w-full h-11 rounded-lg border border-white/[0.08] bg-white/[0.04] text-foreground text-sm px-3 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Optional message body"
            rows={3}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] text-foreground text-sm px-3 py-2.5 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        {/* Link */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Link Path (optional)</label>
          <input
            value={linkPath}
            onChange={(e) => setLinkPath(e.target.value)}
            placeholder="/academy/learn or /academy/room/announcements"
            className="w-full h-11 rounded-lg border border-white/[0.08] bg-white/[0.04] text-foreground text-sm px-3 placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={sending || !title.trim()}
          className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? "Sending…" : "Send to All Students"}
        </button>
      </div>
    </div>
  );
}
