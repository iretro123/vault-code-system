import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyPermissions } from "@/hooks/useAcademyPermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ImagePlus, Trash2, Upload, Loader2, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface Props {
  active: boolean;
}

interface CalendarPost {
  id: string;
  image_url: string;
  image_path: string | null;
  caption: string | null;
  created_by: string;
  created_at: string;
}

const BUCKET = "academy-chat-files";

export function EconomicCalendarTab({ active }: Props) {
  const { user } = useAuth();
  const { isCEO, isAdmin, isOperator } = useAcademyPermissions();
  const canManage = isCEO || isAdmin || isOperator;

  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);


  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("calendar_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Failed to load calendar posts");
    } else {
      setPosts((data ?? []) as CalendarPost[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!active) return;
    fetchPosts();
  }, [active, fetchPosts]);

  useEffect(() => {
    if (!active) return;
    const channel = supabase
      .channel("calendar-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_posts" }, () => {
        fetchPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active, fetchPosts]);

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) {
      toast.error("Only image files are supported");
      return;
    }
    setPendingFiles((prev) => [...prev, ...list]);
    setPreviews((prev) => [...prev, ...list.map((f) => URL.createObjectURL(f))]);
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      const url = prev[idx];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const submitPost = async () => {
    if (!user || !canManage) return;
    const trimmed = caption.trim();
    if (pendingFiles.length === 0 && !trimmed) {
      toast.error("Add an image or a caption");
      return;
    }
    setUploading(true);
    try {
      if (pendingFiles.length === 0) {
        // Text-only post
        const { error: insErr } = await supabase.from("calendar_posts").insert({
          image_url: "",
          image_path: null,
          caption: trimmed,
          created_by: user.id,
        });
        if (insErr) toast.error("Post failed");
      } else {
        for (let i = 0; i < pendingFiles.length; i++) {
          const file = pendingFiles[i];
          const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
          const path = `calendar/${user.id}/${Date.now()}_${i}_${safeName}`;
          const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
            contentType: file.type || "image/png",
            upsert: false,
          });
          if (upErr) {
            toast.error(`Upload failed: ${file.name}`);
            continue;
          }
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
          const { error: insErr } = await supabase.from("calendar_posts").insert({
            image_url: urlData.publicUrl,
            image_path: path,
            caption: i === 0 ? trimmed || null : null,
            created_by: user.id,
          });
          if (insErr) toast.error(`Save failed: ${file.name}`);
        }
      }
      toast.success("Posted to calendar");
      previews.forEach((u) => URL.revokeObjectURL(u));
      setPendingFiles([]);
      setPreviews([]);
      setCaption("");
      fetchPosts();
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canManage) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };


  const handleDelete = async (post: CalendarPost) => {
    if (!canManage) return;
    if (!confirm("Delete this image?")) return;
    const { error } = await supabase.from("calendar_posts").delete().eq("id", post.id);
    if (error) {
      toast.error("Delete failed");
      return;
    }
    if (post.image_path) {
      await supabase.storage.from(BUCKET).remove([post.image_path]);
    }
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
  };

  if (!active) return null;

  return (
    <div
      className="h-full overflow-y-auto overscroll-contain"
      onDragOver={(e) => { if (canManage) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <div className="px-4 py-5">
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">Calendar</h2>
              <p className="text-[11px] text-muted-foreground/60">Weekly economic events & setups</p>
            </div>
          </div>
          {canManage && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => e.target.files && uploadFiles(e.target.files)}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors shrink-0",
                  "bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-50"
                )}
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </>
          )}
        </div>

        {canManage && (
          <div
            className={cn(
              "mb-5 rounded-2xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
              dragOver
                ? "border-primary/60 bg-primary/[0.06]"
                : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
            )}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-5 h-5 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Drag & drop images here, or <span className="text-primary font-semibold">browse</span>
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">PNG, JPG, WEBP • Multiple allowed</p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No calendar posts yet.</p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              {canManage ? "Upload the first image to get started." : "Check back soon for weekly updates."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group relative rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.02]"
              >
                <button
                  type="button"
                  onClick={() => setLightbox(post.image_url)}
                  className="block w-full"
                >
                  <img
                    src={post.image_url}
                    alt={post.caption ?? "Calendar post"}
                    loading="lazy"
                    className="w-full h-auto object-cover max-h-[520px]"
                  />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-white/80">
                    {(() => { try { return format(parseISO(post.created_at), "MMM d, h:mma"); } catch { return ""; } })()}
                  </span>
                  {canManage && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(post); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-red-500/20 text-red-300 hover:bg-red-500/30"
                      aria-label="Delete post"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Preview" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
