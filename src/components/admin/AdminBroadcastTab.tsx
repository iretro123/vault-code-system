import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserOption {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

export function AdminBroadcastTab() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, email")
      .order("display_name")
      .limit(500);
    setUsers((data as UserOption[]) || []);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSend = async () => {
    if (!userId || !title.trim()) { toast.error("Select a user and enter a title"); return; }
    setSending(true);
    const { error } = await supabase.from("inbox_items" as any).insert({
      user_id: userId,
      type: "reminder",
      title: title.trim(),
      body: body.trim(),
      link: null,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Message sent");
      setTitle(""); setBody(""); setUserId("");
    }
    setSending(false);
  };

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-muted-foreground">
        Send a direct motivation message to a specific user's inbox.
      </p>
      <Card className="p-5 space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Recipient</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue placeholder="Select a user…" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.user_id} value={u.user_id}>
                  {u.display_name || u.email || "Unnamed"} {u.email ? `(${u.email})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Title</Label>
          <Input placeholder="e.g. Keep grinding 🔥" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Message (optional)</Label>
          <Textarea placeholder="Personal note…" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
        </div>
        <Button onClick={handleSend} disabled={sending || !userId || !title.trim()} className="gap-1.5">
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send Message
        </Button>
      </Card>
    </div>
  );
}
