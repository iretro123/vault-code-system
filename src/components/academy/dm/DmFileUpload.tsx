import { useRef, useCallback } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DmAttachment } from "./DmAttachmentRenderer";

const ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/jpg", "image/gif",
  "application/pdf", "video/mp4",
];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

interface DmFileUploadProps {
  threadId: string;
  userId: string;
  uploading: boolean;
  setUploading: (v: boolean) => void;
  onUploaded: (attachment: DmAttachment) => void;
  disabled?: boolean;
}

export function DmFileUpload({ threadId, userId, uploading, setUploading, onUploaded, disabled }: DmFileUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!ALLOWED_MIME.includes(file.type)) {
      toast.error("Unsupported file type. Allowed: PNG, JPG, GIF, PDF, MP4");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 15 MB.");
      return;
    }

    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error("Upload failed: not authenticated");
        return;
      }

      const safeFileName = file.name
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");

      const path = `dm-${threadId}/${userId}/${Date.now()}_${safeFileName}`;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");

      const res = await fetch(`${supabaseUrl}/storage/v1/object/academy-chat-files/${encodedPath}`, {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          authorization: `Bearer ${accessToken}`,
          "content-type": file.type || "application/octet-stream",
          "x-upsert": "false",
        },
        body: file,
      });

      if (!res.ok) {
        const errText = await res.text();
        toast.error(`Upload failed: ${res.status}`);
        console.error("[DmFileUpload] error", res.status, errText);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("academy-chat-files")
        .getPublicUrl(path);

      onUploaded({
        type: file.type.startsWith("image/") ? "image" : "file",
        url: urlData.publicUrl,
        filename: file.name,
        size: file.size,
        mime: file.type,
      });
    } catch (err) {
      console.error("[DmFileUpload] error", err);
      toast.error("Upload failed unexpectedly.");
    } finally {
      setUploading(false);
    }
  }, [threadId, userId, setUploading, onUploaded]);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_MIME.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading || disabled}
        className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors disabled:opacity-30"
        aria-label="Attach file"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
      </button>
    </>
  );
}
