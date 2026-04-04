import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Play, X, GraduationCap } from "lucide-react";
import { QUIZ_MAP } from "@/components/academy/LessonQuiz";

interface LatestLesson {
  id: string;
  lesson_title: string;
  module_slug: string;
  module_title: string;
  video_url: string;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getEmbedUrl(url: string): string | null {
  const ytId = getYouTubeId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  return null;
}

export function StartLearningCard() {
  const [lesson, setLesson] = useState<LatestLesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const navigate = useNavigate();

  const QUIZ_SLUGS = Object.keys(QUIZ_MAP);
  const hasQuiz = lesson && QUIZ_SLUGS.includes(lesson.module_slug);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("academy_lessons")
        .select("id, lesson_title, module_slug, module_title, video_url")
        .eq("visible", true)
        .order("created_at", { ascending: false })
        .limit(1);
      setLesson(data?.[0] || null);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="vault-luxury-card p-6 animate-pulse">
        <div className="h-6 w-40 rounded bg-muted/30 mb-4" />
        <div className="h-40 rounded-xl bg-muted/20" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="vault-luxury-card p-6">
        <div className="flex items-center gap-3">
          <Play className="h-5 w-5 text-primary" />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary/80">
            Start Learning
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-3">No lessons available yet.</p>
      </div>
    );
  }

  const ytId = getYouTubeId(lesson.video_url);
  const thumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
  const embedUrl = getEmbedUrl(lesson.video_url);

  return (
    <div className="vault-luxury-card p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-primary/80">
            New Lesson Drop
          </span>
        </div>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60 mb-1">
        {lesson.module_title}
      </p>
      <h3 className="text-base font-semibold text-foreground mb-4">
        {lesson.lesson_title}
      </h3>

      {/* Video area */}
      {playing && embedUrl ? (
        <div className="relative w-full rounded-xl overflow-hidden mb-4" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            frameBorder="0"
          />
          <button
            onClick={() => setPlaying(false)}
            className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 hover:bg-black/80 transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setPlaying(true)}
          className="relative w-full rounded-xl overflow-hidden mb-4 group cursor-pointer block"
          style={{ aspectRatio: "16/9", background: "hsl(var(--muted))" }}
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={lesson.lesson_title}
              className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-200"
            />
          ) : (
            <div className="absolute inset-0 bg-muted/40" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-150">
              <Play className="h-6 w-6 text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>
        </button>
      )}

      <button
        onClick={() => setPlaying(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 active:scale-[0.97]"
      >
        <Play className="h-4 w-4" /> Watch Now
      </button>
    </div>
  );
}
