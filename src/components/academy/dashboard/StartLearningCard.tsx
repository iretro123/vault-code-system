import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Play, X, GraduationCap, Check } from "lucide-react";
import { QUIZ_MAP } from "@/components/academy/LessonQuiz";
import { getVideoEmbedUrl, getYouTubeThumbnail } from "@/lib/videoEmbeds";
import { getLessonTakeaways } from "@/lib/lessonTakeaways";

interface LatestLesson {
  id: string;
  lesson_title: string;
  module_slug: string;
  module_title: string;
  video_url: string;
}

/** Days elapsed since epoch in the viewer's local time — changes exactly once a day. */
function dayIndex(): number {
  const now = new Date();
  return Math.floor(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000,
  );
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
        .not("video_url", "is", null)
        .order("created_at", { ascending: false });

      const pool = (data || []).filter((l) => !!l.video_url);
      if (!pool.length) {
        setLesson(null);
      } else {
        // Rotates to a different lesson each day, same pick for everyone.
        setLesson(pool[dayIndex() % pool.length]);
      }
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

  const thumbnail = getYouTubeThumbnail(lesson.video_url);
  const embedUrl = getVideoEmbedUrl(lesson.video_url);

  return (
    <div className="vault-luxury-card p-6 h-full flex flex-col">
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
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
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

      <div className="mt-auto space-y-2">
        <button
          onClick={() => setPlaying(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 active:scale-[0.97]"
        >
          <Play className="h-4 w-4" /> Watch Now
        </button>

        {hasQuiz && (
          <button
            onClick={() => navigate(`/academy/learn/${lesson.module_slug}`)}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold border border-primary/30 text-primary hover:bg-primary/10 transition-all duration-150 active:scale-[0.97]"
          >
            <GraduationCap className="h-4 w-4" /> Take the Quiz
          </button>
        )}
      </div>
    </div>
  );
}
