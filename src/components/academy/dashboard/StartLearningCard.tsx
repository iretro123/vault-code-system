import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Play, ArrowRight } from "lucide-react";

interface LatestLesson {
  id: string;
  lesson_title: string;
  module_slug: string;
  module_title: string;
}

export function StartLearningCard() {
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LatestLesson | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("academy_lessons")
        .select("id, lesson_title, module_slug, module_title")
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
        <div className="h-12 rounded bg-muted/20" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="vault-luxury-card p-6">
        <div className="flex items-center gap-3">
          <Play className="h-5 w-5 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-400/80">
            Start Learning
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-3">No lessons available yet.</p>
      </div>
    );
  }

  return (
    <div className="vault-luxury-card p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-400/80">
            Start Learning
          </span>
        </div>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50">
          New Drop
        </span>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60 mb-1">
        {lesson.module_title}
      </p>
      <h3 className="text-base font-semibold text-foreground mb-4">
        {lesson.lesson_title}
      </h3>

      <button
        onClick={() => navigate(`/academy/learn/${lesson.module_slug}`)}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.97] hover:brightness-110"
        style={{
          background: "linear-gradient(135deg, hsl(38 92% 50%) 0%, hsl(32 95% 44%) 100%)",
          color: "#1a1a1a",
        }}
      >
        Start Module <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
