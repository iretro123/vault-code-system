import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { getModuleBySlug } from "@/lib/academyModules";
import { useAcademyLessons } from "@/hooks/useAcademyLessons";
import { ArrowLeft, PlayCircle, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";

function getEmbedUrl(url: string): string | null {
  try {
    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // Loom
    const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
    if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
    // Already an embed URL or other
    if (url.includes("/embed")) return url;
  } catch {}
  return null;
}

const AcademyModule = () => {
  const { moduleSlug } = useParams();
  const navigate = useNavigate();
  const mod = getModuleBySlug(moduleSlug || "");
  const { lessons, loading } = useAcademyLessons(moduleSlug);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  if (!mod) {
    return <Navigate to="/academy/learn" replace />;
  }

  // Use DB lessons if available, otherwise fall back to static
  const hasDbLessons = lessons.length > 0;

  return (
    <AcademyLayout>
      <div className="px-4 md:px-6 pt-4">
        <button
          onClick={() => navigate("/academy/learn")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Modules
        </button>
      </div>

      <PageHeader title={mod.title} subtitle={mod.subtitle} />

      <div className="px-4 md:px-6 pb-6">
        <div className="max-w-3xl space-y-4">
          {/* Video player area */}
          {activeVideo && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground">Now Playing</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setActiveVideo(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              {(() => {
                const embedUrl = getEmbedUrl(activeVideo);
                if (embedUrl) {
                  return (
                    <AspectRatio ratio={16 / 9}>
                      <iframe
                        src={embedUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Lesson video"
                      />
                    </AspectRatio>
                  );
                }
                return (
                  <div className="p-6 text-center">
                    <a href={activeVideo} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                      Open video in new tab →
                    </a>
                  </div>
                );
              })()}
            </Card>
          )}

          {/* Lesson list */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : hasDbLessons ? (
            <div className="space-y-2">
              {lessons.map((lesson, i) => (
                <Card key={lesson.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <span className="text-xs font-mono font-semibold text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground">{lesson.lesson_title}</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs shrink-0"
                      onClick={() => setActiveVideo(lesson.video_url)}
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      Watch
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {mod.lessons.map((lesson, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <span className="text-xs font-mono font-semibold text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground">{lesson.title}</h4>
                      <p className="text-[11px] text-muted-foreground">{lesson.duration}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs shrink-0" disabled>
                      <PlayCircle className="h-3.5 w-3.5" />
                      Soon
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyModule;
