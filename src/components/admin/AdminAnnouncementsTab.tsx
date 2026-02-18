import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Megaphone, Pin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AdminAnnouncementsTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [pinned, setPinned] = useState(false);
  const [sending, setSending] = useState(false);

  const handlePost = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSending(true);
    const { error } = await supabase.from("inbox_items" as any).insert({
      user_id: null,
      type: "announcement",
      title: title.trim(),
      body: body.trim(),
      link: link.trim() || null,
      pinned,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Announcement posted");
      setTitle(""); setBody(""); setLink(""); setPinned(false);
    }
    setSending(false);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Announcements are delivered to every user's inbox. Pinned items stay at the top.
      </p>
      <Card className="p-5 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input placeholder="e.g. New Trading Challenge starts Monday" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Body (optional)</Label>
          <Textarea placeholder="Details…" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Link (optional)</Label>
          <Input placeholder="/academy/room/announcements" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={pinned} onCheckedChange={setPinned} />
          <Label className="text-xs flex items-center gap-1.5">
            <Pin className="h-3 w-3" /> Pin to top
          </Label>
        </div>
        <Button onClick={handlePost} disabled={sending || !title.trim()} className="gap-1.5">
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Megaphone className="h-3.5 w-3.5" />}
          Broadcast
        </Button>
      </Card>
    </div>
  );
}
