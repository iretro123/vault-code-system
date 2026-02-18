import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Megaphone, Pin, Loader2, Lock, Image, Trash2, Bell, BellRing, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDateTimeFull } from "@/lib/formatTime";

interface Announcement {
  id: string;
  author_id: string;
  title: string;
  body: string;
  link: string | null;
  image_url: string | null;
  delivery_mode: string;
  segment: string;
  is_pinned: boolean;
  replies_locked: boolean;
  created_at: string;
}

const DELIVERY_OPTIONS = [
  { value: "in_app", label: "In-app only", icon: Megaphone, desc: "Shows in announcements room" },
  { value: "in_app_notify", label: "In-app + Notify", icon: Bell, desc: "Also adds unread badge to bell + inbox" },
  { value: "in_app_notify_ping", label: "In-app + Notify + Ping @everyone", icon: BellRing, desc: "Sends push notification to all members" },
];

const SEGMENT_OPTIONS = [
  { value: "all", label: "All Members" },
  { value: "beginner", label: "Beginners" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export function AdminAnnouncementsTab() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("in_app");
  const [segment, setSegment] = useState("all");
  const [pinned, setPinned] = useState(false);
  const [repliesLocked, setRepliesLocked] = useState(false);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    const { data } = await supabase
      .from("academy_announcements" as any)
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setAnnouncements((data as any[] || []) as Announcement[]);
    setLoadingList(false);
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const resetForm = () => {
    setTitle(""); setBody(""); setLink(""); setImageUrl("");
    setDeliveryMode("in_app"); setSegment("all");
    setPinned(false); setRepliesLocked(false); setEditingId(null);
  };

  const handlePost = async () => {
    if (!title.trim() || !user) { toast.error("Title is required"); return; }
    setSending(true);

    const payload: any = {
      title: title.trim(),
      body: body.trim(),
      link: link.trim() || null,
      image_url: imageUrl.trim() || null,
      delivery_mode: deliveryMode,
      segment,
      is_pinned: pinned,
      replies_locked: repliesLocked,
    };

    if (editingId) {
      payload.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from("academy_announcements" as any)
        .update(payload)
        .eq("id", editingId);
      if (error) toast.error(error.message);
      else { toast.success("Announcement updated"); resetForm(); fetchList(); }
    } else {
      payload.author_id = user.id;
      const { data, error } = await supabase
        .from("academy_announcements" as any)
        .insert(payload)
        .select()
        .single();

      if (error) {
        toast.error(error.message);
      } else {
        // If delivery includes notify, also create inbox + notification entries
        if (deliveryMode === "in_app_notify" || deliveryMode === "in_app_notify_ping") {
          await supabase.from("inbox_items" as any).insert({
            user_id: null,
            type: "announcement",
            title: title.trim(),
            body: body.trim(),
            link: "/academy/room/announcements",
            pinned,
          } as any);
        }

        if (deliveryMode === "in_app_notify_ping") {
          await supabase.from("academy_notifications" as any).insert({
            user_id: null,
            type: "announcement",
            title: title.trim(),
            body: body.trim(),
            link_path: "/academy/room/announcements",
          } as any);
        }

        toast.success("Announcement published");
        resetForm();
        fetchList();
      }
    }
    setSending(false);
  };

  const handleEdit = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setLink(a.link || "");
    setImageUrl(a.image_url || "");
    setDeliveryMode(a.delivery_mode);
    setSegment(a.segment);
    setPinned(a.is_pinned);
    setRepliesLocked(a.replies_locked);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("academy_announcements" as any)
      .delete()
      .eq("id", deleteId);
    if (error) toast.error(error.message);
    else { toast.success("Announcement deleted"); fetchList(); }
    setDeleteId(null);
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    await supabase
      .from("academy_announcements" as any)
      .update({ is_pinned: !currentPinned } as any)
      .eq("id", id);
    fetchList();
  };

  const handleToggleLock = async (id: string, currentLocked: boolean) => {
    await supabase
      .from("academy_announcements" as any)
      .update({ replies_locked: !currentLocked } as any)
      .eq("id", id);
    fetchList();
  };

  const deliveryLabel = (mode: string) => DELIVERY_OPTIONS.find((d) => d.value === mode)?.label ?? mode;
  const segmentLabel = (seg: string) => SEGMENT_OPTIONS.find((s) => s.value === seg)?.label ?? seg;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Composer */}
      <Card className="p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">
          {editingId ? "Edit Announcement" : "New Announcement"}
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs">Title *</Label>
          <Input
            placeholder="e.g. New Trading Challenge starts Monday"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Body</Label>
          <Textarea
            placeholder="Announcement details…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Link (optional)</Label>
            <Input
              placeholder="/academy/room/announcements"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1.5">
              <Image className="h-3 w-3" /> Image URL (optional)
            </Label>
            <Input
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
        </div>

        {/* Delivery & Segment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Delivery Mode</Label>
            <Select value={deliveryMode} onValueChange={setDeliveryMode}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERY_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    <div className="flex items-center gap-2">
                      <d.icon className="h-3.5 w-3.5" />
                      <span>{d.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {DELIVERY_OPTIONS.find((d) => d.value === deliveryMode)?.desc}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Target Segment</Label>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENT_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={pinned} onCheckedChange={setPinned} />
            <Label className="text-xs flex items-center gap-1.5">
              <Pin className="h-3 w-3" /> Pin to top
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={repliesLocked} onCheckedChange={setRepliesLocked} />
            <Label className="text-xs flex items-center gap-1.5">
              <Lock className="h-3 w-3" /> Lock replies
            </Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handlePost} disabled={sending || !title.trim()} className="gap-1.5">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Megaphone className="h-3.5 w-3.5" />}
            {editingId ? "Update" : "Publish"}
          </Button>
          {editingId && (
            <Button variant="ghost" onClick={resetForm}>Cancel</Button>
          )}
        </div>
      </Card>

      {/* Existing announcements */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Published ({announcements.length})
        </p>
        {loadingList ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          </Card>
        ) : (
          announcements.map((a) => (
            <Card key={a.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                    {a.is_pinned && (
                      <Badge variant="outline" className="text-[10px] gap-1 h-5">
                        <Pin className="h-2.5 w-2.5" /> Pinned
                      </Badge>
                    )}
                    {a.replies_locked && (
                      <Badge variant="outline" className="text-[10px] gap-1 h-5">
                        <Lock className="h-2.5 w-2.5" /> Locked
                      </Badge>
                    )}
                  </div>
                  {a.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</p>}
                  {a.image_url && (
                    <img src={a.image_url} alt="" className="rounded-lg max-w-[200px] max-h-[120px] mt-2 object-cover" />
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground/70">
                      {formatDateTimeFull(a.created_at)}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-5">{deliveryLabel(a.delivery_mode)}</Badge>
                    <Badge variant="secondary" className="text-[10px] h-5">{segmentLabel(a.segment)}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Toggle pin" onClick={() => handleTogglePin(a.id, a.is_pinned)}>
                    <Pin className={`h-3 w-3 ${a.is_pinned ? "text-primary" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Toggle replies" onClick={() => handleToggleLock(a.id, a.replies_locked)}>
                    <Lock className={`h-3 w-3 ${a.replies_locked ? "text-primary" : ""}`} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => handleEdit(a)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeleteId(a.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this announcement. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
