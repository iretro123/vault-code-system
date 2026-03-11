import { useState, useEffect, useRef } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calculator, FileText, BookOpen, Download, Shield, Sliders,
  Plus, Trash2, Upload, ExternalLink, Eye, EyeOff,
  Loader2, ClipboardList, Target, BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { VaultTradePlanner } from "@/components/vault-planner/VaultTradePlanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminActionBar } from "@/components/admin/AdminActionBar";

/* ─── Types ─── */
const DB_CATEGORIES = [
  { value: "templates", label: "Templates", icon: FileText },
  { value: "calculators", label: "Calculators", icon: Calculator },
  { value: "playbooks", label: "Playbooks", icon: BookOpen },
  { value: "downloads", label: "Downloads", icon: Download },
] as const;

type Category = (typeof DB_CATEGORIES)[number]["value"];

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

/* ═══════════════════════════════════════════════════
   STATIC TOOLKIT SECTIONS
   ═══════════════════════════════════════════════════ */

/* ─── Risk Per Trade Calculator ─── */
function RiskCalcCard() {
  const [balance, setBalance] = useState("10000");
  const [risk, setRisk] = useState("1");
  const bal = parseFloat(balance) || 0;
  const pct = parseFloat(risk) || 0;
  const maxLoss = bal * (pct / 100);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Risk Per Trade</h4>
          <p className="text-[11px] text-muted-foreground">How much can you lose on one trade?</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Account ($)</Label>
          <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="h-9 text-sm font-mono bg-white/[0.03] border-white/[0.08]" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Risk (%)</Label>
          <Input type="number" step="0.1" value={risk} onChange={(e) => setRisk(e.target.value)} className="h-9 text-sm font-mono bg-white/[0.03] border-white/[0.08]" />
        </div>
      </div>
      <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Max Loss Per Trade</p>
        <p className="text-xl font-bold font-mono text-primary">${maxLoss.toFixed(2)}</p>
      </div>
    </Card>
  );
}

/* ─── Position Size Calculator ─── */
function PositionSizeCalcCard() {
  const [balance, setBalance] = useState("10000");
  const [risk, setRisk] = useState("1");
  const [stopLoss, setStopLoss] = useState("2");
  const bal = parseFloat(balance) || 0;
  const pct = parseFloat(risk) || 0;
  const sl = parseFloat(stopLoss) || 1;
  const maxLoss = bal * (pct / 100);
  const posSize = maxLoss / (sl / 100);

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Calculator className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Position Size</h4>
          <p className="text-[11px] text-muted-foreground">Calculate max position from stop loss</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Account ($)</Label>
          <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="h-9 text-sm font-mono bg-white/[0.03] border-white/[0.08]" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Risk (%)</Label>
          <Input type="number" step="0.1" value={risk} onChange={(e) => setRisk(e.target.value)} className="h-9 text-sm font-mono bg-white/[0.03] border-white/[0.08]" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Stop Loss (%)</Label>
          <Input type="number" step="0.1" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className="h-9 text-sm font-mono bg-white/[0.03] border-white/[0.08]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Max Loss</p>
          <p className="text-lg font-bold font-mono text-foreground">${maxLoss.toFixed(2)}</p>
        </div>
        <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Position Size</p>
          <p className="text-lg font-bold font-mono text-primary">${posSize.toFixed(2)}</p>
        </div>
      </div>
    </Card>
  );
}

/* ─── Static template cards ─── */
const TEMPLATES = [
  { title: "Trade Journal Template", desc: "Structured daily entry: ticker, setup, entry/exit, lesson.", icon: ClipboardList },
  { title: "Weekly Review Template", desc: "5-question weekly reflection to improve consistency.", icon: BarChart3 },
  { title: "Trading Plan Template", desc: "Define your edge, rules, risk limits, and session schedule.", icon: Target },
];

function TemplatesSection() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {TEMPLATES.map((t) => {
        const Icon = t.icon;
        return (
          <Card key={t.title} className="p-5 flex flex-col gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">{t.title}</h4>
              <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
            </div>
            <span className="text-[10px] text-muted-foreground/60 mt-auto">Coming soon</span>
          </Card>
        );
      })}
    </div>
  );
}

/* ─── Presets ─── */
const PRESETS = [
  { title: "Beginner", desc: "1% risk, 2 trades/day, $250 daily loss cap. Conservative guardrails.", color: "hsl(142,70%,45%)" },
  { title: "Intermediate", desc: "1.5% risk, 3 trades/day, $500 daily loss cap. Balanced approach.", color: "hsl(45,90%,50%)" },
  { title: "Advanced", desc: "2% risk, 5 trades/day, $1000 daily loss cap. For experienced traders.", color: "hsl(0,70%,55%)" },
];

function PresetsSection() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {PRESETS.map((p) => (
        <Card key={p.title} className="p-5 flex flex-col gap-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[3px]" style={{ background: p.color }} />
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">{p.title}</h4>
          </div>
          <p className="text-xs text-muted-foreground">{p.desc}</p>
          <span className="text-[10px] text-muted-foreground/60 mt-auto">Apply in Settings → Trading Prefs</span>
        </Card>
      ))}
    </div>
  );
}

/* ─── Downloads ─── */
const DOWNLOADS = [
  { title: "Pre-Market Checklist", desc: "PDF checklist to run before every session." },
  { title: "End-of-Day Review Sheet", desc: "PDF to log daily performance and reflections." },
  { title: "Risk Rules One-Pager", desc: "Quick reference of Vault risk parameters." },
];

function DownloadsSection() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {DOWNLOADS.map((d) => (
        <Card key={d.title} className="p-5 flex flex-col gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
            <Download className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{d.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{d.desc}</p>
          </div>
          <span className="text-[10px] text-muted-foreground/60 mt-auto">PDF · Coming soon</span>
        </Card>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   DB-DRIVEN GRID (admin-uploaded items)
   ═══════════════════════════════════════════════════ */
function DbToolkitGrid({ items }: { items: ToolkitItem[] }) {
  const grouped = DB_CATEGORIES.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category === cat.value && i.visible),
  }));

  const hasAny = grouped.some((g) => g.items.length > 0);
  if (!hasAny) return null;

  return (
    <>
      {grouped.map((group) => {
        if (group.items.length === 0) return null;
        const Icon = group.icon;
        return (
          <div key={group.value}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">{group.label} (Uploaded)</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <Card
                  key={item.id}
                  className="p-5 flex flex-col gap-3 cursor-pointer hover:border-primary/30 transition-colors"
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
    </>
  );
}

/* ═══════════════════════════════════════════════════
   ADMIN MANAGER (unchanged logic)
   ═══════════════════════════════════════════════════ */
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
      const { error: uploadErr } = await supabase.storage.from("toolkit-files").upload(filePath, file);
      if (uploadErr) { toast.error("File upload failed"); setSaving(false); return; }
      const { data: urlData } = supabase.storage.from("toolkit-files").getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
    }
    const maxSort = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const { error } = await supabase.from("toolkit_items").insert({
      title: title.trim(), description: description.trim(), category,
      file_url: fileUrl, external_url: externalUrl.trim() || null,
      sort_order: maxSort, created_by: user.id,
    } as any);
    if (error) { toast.error("Failed to add resource"); setSaving(false); return; }
    await supabase.from("inbox_items").insert({
      title: "New resource added", body: `"${title.trim()}" was added to the Toolkit.`,
      type: "toolkit_activity", link: "/academy/resources", user_id: null,
      sender_id: user!.id,
    });
    toast.success("Resource added");
    setTitle(""); setDescription(""); setExternalUrl(""); setFile(null); setAdding(false);
    setSaving(false); refetch();
  };

  const handleToggleVisibility = async (id: string, visible: boolean) => {
    await supabase.from("toolkit_items").update({ visible } as any).eq("id", id); refetch();
  };
  const handleDelete = async (id: string) => {
    await supabase.from("toolkit_items").delete().eq("id", id); toast.success("Resource removed"); refetch();
  };
  const handleReorder = async (id: string, direction: "up" | "down") => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((i) => i.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx]; const b = sorted[swapIdx];
    await Promise.all([
      supabase.from("toolkit_items").update({ sort_order: b.sort_order } as any).eq("id", a.id),
      supabase.from("toolkit_items").update({ sort_order: a.sort_order } as any).eq("id", b.id),
    ]); refetch();
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Manage Resources</h3>
        <Button size="sm" onClick={() => setAdding(!adding)} variant={adding ? "outline" : "default"} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />{adding ? "Cancel" : "Add Resource"}
        </Button>
      </div>
      {adding && (
        <Card className="p-5 space-y-3">
          <div className="space-y-1.5"><Label className="text-xs">Title</Label><Input placeholder="e.g. Pre-Market Checklist" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Description</Label><Textarea placeholder="Short description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DB_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">File Upload (optional)</Label>
            <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="gap-1.5"><Upload className="h-3.5 w-3.5" />{file ? file.name : "Choose file"}</Button>
          </div>
          <div className="space-y-1.5"><Label className="text-xs">External URL (optional)</Label><Input placeholder="https://..." value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} /></div>
          <Button onClick={handleAdd} disabled={!title.trim() || saving} className="w-full gap-2">{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Add Resource</Button>
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
              <button onClick={() => handleToggleVisibility(item.id, !item.visible)} className="text-muted-foreground hover:text-foreground" title={item.visible ? "Hide" : "Show"}>
                {item.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No uploaded resources yet.</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
const AcademyResources = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "operator";
  const [items, setItems] = useState<ToolkitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("browse");

  const fetchItems = async () => {
    const { data } = await supabase.from("toolkit_items").select("*").order("sort_order", { ascending: true });
    setItems((data as any as ToolkitItem[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const SectionLabel = ({ icon: Icon, label }: { icon: typeof Calculator; label: string }) => (
    <div className="flex items-center gap-2 mb-3 mt-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">{label}</h2>
    </div>
  );

  const browseContent = (
    <div className="space-y-8 max-w-5xl">
      {/* Vault Trade Planner (XP-style) */}
      <div>
        <SectionLabel icon={Calculator} label="VAULT Approval" />
        <VaultTradePlanner />
      </div>

      {/* 2) Templates */}
      <div>
        <SectionLabel icon={FileText} label="Templates" />
        <TemplatesSection />
      </div>

      {/* 3) Presets */}
      <div>
        <SectionLabel icon={Sliders} label="Risk Firewall Presets" />
        <PresetsSection />
      </div>

      {/* 4) Downloads */}
      <div>
        <SectionLabel icon={Download} label="Downloads" />
        <DownloadsSection />
      </div>

      {/* DB-driven uploaded items */}
      {!loading && <DbToolkitGrid items={items} />}
    </div>
  );

  return (
    <>
      <PageHeader title="Toolkit" subtitle="Calculators, templates, presets, and downloads" />
      <div className="px-4 md:px-6 pb-10 space-y-4">
        <AdminActionBar
          title="Toolkit Admin"
          permission="manage_content"
          actions={[
            { label: "Upload Resource", disabled: true },
            { label: "Reorder Items", disabled: true },
          ]}
        />
        {isAdmin ? (
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList className="bg-white/[0.03] border border-white/[0.06] p-1 h-auto">
              <TabsTrigger value="browse" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">Browse</TabsTrigger>
              <TabsTrigger value="manage" className="gap-1.5 text-xs data-[state=active]:bg-white/[0.08] px-3 py-1.5">Manage</TabsTrigger>
            </TabsList>
            <TabsContent value="browse">{browseContent}</TabsContent>
            <TabsContent value="manage"><AdminToolkitManager items={items} refetch={fetchItems} /></TabsContent>
          </Tabs>
        ) : browseContent}
      </div>
    </>
  );
};

export default AcademyResources;
