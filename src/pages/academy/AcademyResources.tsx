import { useState, useEffect, useRef } from "react";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calculator, FileText, BookOpen, Download,
  Plus, Trash2, GripVertical, Upload, ExternalLink, Eye, EyeOff,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "templates", label: "Templates", icon: FileText },
  { value: "calculators", label: "Calculators", icon: Calculator },
  { value: "playbooks", label: "Playbooks", icon: BookOpen },
  { value: "downloads", label: "Downloads", icon: Download },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

interface ToolkitItem {
  id: string;
  title: string;
  description: string;
  category: Category;
  file_url: string | null;
  external_url: string | null;
  icon: string;
  sort_order: number;
  visible: boolean;
  created_at: string;
}

// ─── Public Toolkit View ───
function ToolkitGrid({ items }: { items: ToolkitItem[] }) {
  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category === cat.value && i.visible),
  }));

  return (
    <div className="space-y-8 max-w-4xl">
      {grouped.map((group) => {
        if (group.items.length === 0) return null;
        const Icon = group.icon;
        return (
          <div key={group.value}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{group.label}</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <Card
                  key={item.id}
                  className="vault-card p-5 flex flex-col gap-3 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => {
                    const url = item.file_url || item.external_url;
                    if (url) window.open(url, "_blank");
                  }}
                >
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                  {(item.file_url || item.external_url) && (
                    <div className="flex items-center gap-1 text-[10px] text-primary font-medium">
                      {item.file_url ? <Download className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                      {item.file_url ? "Download" : "Open"}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {grouped.every((g) => g.items.length === 0) && (
        <Card className="p-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No resources available yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Admin will add templates, playbooks, and tools here.</p>
        </Card>
      )}
    </div>
  );
}

// ─── Admin Manager ───
function AdminToolkitManager({ items, refetch }: { items: ToolkitItem[]; refetch: () => void }) {
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("templates");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);

    let fileUrl: string | null = null;

    if (file) {
      const filePath = `${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("toolkit-files")
        .upload(filePath, file);
      if (uploadErr) {
        toast.error("File upload failed");
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("toolkit-files").getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
    }

    const maxSort = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;

    const { error } = await supabase.from("toolkit_items").insert({
      title: title.trim(),
      description: description.trim(),
      category,
      file_url: fileUrl,
      external_url: externalUrl.trim() || null,
      sort_order: maxSort,
      created_by: user.id,
    } as any);

    if (error) {
      toast.error("Failed to add resource");
      setSaving(false);
      return;
    }

    // Create activity event in inbox
    await supabase.from("inbox_items").insert({
      title: "New resource added",
      body: `"${title.trim()}" was added to the Toolkit.`,
      type: "toolkit_activity",
      link: "/academy/resources",
      user_id: null,
    });

    toast.success("Resource added");
    setTitle(""); setDescription(""); setExternalUrl(""); setFile(null); setAdding(false);
    setSaving(false);
    refetch();
  };

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    await supabase.from("toolkit_items").update({ visible } as any).eq("id", id);
    refetch();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("toolkit_items").delete().eq("id", id);
    toast.success("Resource removed");
    refetch();
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((i) => i.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const a = sorted[idx];
    const b = sorted[swapIdx];

    await Promise.all([
      supabase.from("toolkit_items").update({ sort_order: b.sort_order } as any).eq("id", a.id),
      supabase.from("toolkit_items").update({ sort_order: a.sort_order } as any).eq("id", b.id),
    ]);
    refetch();
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Manage Resources</h3>
        <Button size="sm" onClick={() => setAdding(!adding)} variant={adding ? "outline" : "default"} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          {adding ? "Cancel" : "Add Resource"}
        </Button>
      </div>

      {adding && (
        <Card className="p-5 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input placeholder="e.g. Pre-Market Checklist" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">File Upload (optional)</Label>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              {file ? file.name : "Choose file"}
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">External URL (optional)</Label>
            <Input placeholder="https://..." value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
          </div>
          <Button onClick={handleAdd} disabled={!title.trim() || saving} className="w-full gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Add Resource
          </Button>
        </Card>
      )}

      <div className="space-y-2">
        {[...items].sort((a, b) => a.sort_order - b.sort_order).map((item, idx) => (
          <Card key={item.id} className="p-4 flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => handleReorder(item.id, "up")} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-xs">▲</button>
              <button onClick={() => handleReorder(item.id, "down")} disabled={idx === items.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20 text-xs">▼</button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground truncate">{item.category} · {item.description || "No description"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleToggleVisibility(item.id, !item.visible)}
                className="text-muted-foreground hover:text-foreground"
                title={item.visible ? "Hide" : "Show"}
              >
                {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No resources yet. Add your first one above.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───
const AcademyResources = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "operator";
  const [items, setItems] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("browse");

  const fetchItems = async () => {
    const { data } = await supabase
      .from("toolkit_items")
      .select("*")
      .order("sort_order", { ascending: true });
    setItems((data as any as ToolkitItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  return (
    <AcademyLayout>
      <PageHeader title="Toolkit" subtitle="Templates, calculators, playbooks, and downloads" />
      <div className="px-4 md:px-6 pb-6">
        {isAdmin ? (
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 h-auto">
              <TabsTrigger value="browse" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">Browse</TabsTrigger>
              <TabsTrigger value="manage" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">Manage</TabsTrigger>
            </TabsList>
            <TabsContent value="browse">
              {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ToolkitGrid items={items} />}
            </TabsContent>
            <TabsContent value="manage">
              <AdminToolkitManager items={items} refetch={fetchItems} />
            </TabsContent>
          </Tabs>
        ) : (
          loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <ToolkitGrid items={items} />
        )}
      </div>
    </AcademyLayout>
  );
};

export default AcademyResources;
