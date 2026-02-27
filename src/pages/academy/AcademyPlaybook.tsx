import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { AcademyLayout } from "@/components/layout/AcademyLayout";
import { usePlaybookProgress } from "@/hooks/usePlaybookProgress";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";
import { AdminActionBar } from "@/components/admin/AdminActionBar";
import { VaultPlaybookIcon } from "@/components/icons/VaultPlaybookIcon";
import { PlaybookReader } from "@/components/playbook/PlaybookReader";
import { PlaybookChapterList } from "@/components/playbook/PlaybookChapterList";
import { PlaybookRightPanel } from "@/components/playbook/PlaybookRightPanel";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { PremiumGate } from "@/components/academy/PremiumGate";

const AcademyPlaybook = () => {
  const [searchParams] = useSearchParams();
  const { hasAccess, status, loading: accessLoading } = useStudentAccess();
  const {
    chapters,
    progress,
    loading,
    nextChapter,
    updateProgress,
    saveReadingState,
    unlockedIndex,
    lastChapterId,
  } = usePlaybookProgress();
  const { isAdmin } = useAcademyRole();
  const { user } = useAuth();
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ESC to exit expanded mode
  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isExpanded]);

  // Fetch signed URL once user is authenticated
  useEffect(() => {
    if (!user) return;
    async function getUrl() {
      setPdfLoading(true);
      setPdfError(null);
      try {
        const { data, error } = await supabase.functions.invoke("playbook-signed-url", {
          method: "POST",
        });
        if (error) {
          console.error("Edge function invoke error:", error);
          setPdfError("Unable to load Playbook PDF. Check storage path.");
        } else if (data?.error) {
          console.error("Signed URL error:", data.error, data.details);
          setPdfError("Unable to load Playbook PDF. Check storage path.");
        } else if (data?.signedUrl) {
          setPdfUrl(data.signedUrl);
        } else {
          setPdfError("Unable to load Playbook PDF. Check storage path.");
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setPdfError("Unable to load Playbook PDF. Check storage path.");
      }
      setPdfLoading(false);
    }
    getUrl();
  }, [user]);

  // Set initial chapter from URL > saved state > next chapter > first
  useEffect(() => {
    if (chapters.length === 0 || activeChapterId) return;
    const urlChapter = searchParams.get("chapter");
    if (urlChapter && chapters.find((c) => c.id === urlChapter)) {
      setActiveChapterId(urlChapter);
    } else if (lastChapterId && chapters.find((c) => c.id === lastChapterId)) {
      setActiveChapterId(lastChapterId);
    } else {
      setActiveChapterId(nextChapter?.id || chapters[0].id);
    }
  }, [chapters, lastChapterId]);

  const activeChapter = chapters.find((c) => c.id === activeChapterId);
  const isLocked = activeChapter
    ? activeChapter.order_index > unlockedIndex &&
      !(progress[activeChapter.id]?.status === "completed" || progress[activeChapter.id]?.checkpoint_passed)
    : false;

  const handleSelectChapter = useCallback(
    (id: string) => {
      setActiveChapterId(id);
      setReachedEnd(false);
    },
    []
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (!activeChapterId) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveReadingState(activeChapterId, page);
      }, 800);
    },
    [activeChapterId, saveReadingState]
  );

  const handleReachedEnd = useCallback(() => {
    setReachedEnd(true);
  }, []);

  const handleGoToUnlocked = useCallback(() => {
    const ch = chapters.find((c) => c.order_index === unlockedIndex);
    if (ch) handleSelectChapter(ch.id);
  }, [chapters, unlockedIndex, handleSelectChapter]);

  if (loading) {
    return (
      <AcademyLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AcademyLayout>
    );
  }

  if (chapters.length === 0) {
    return (
      <AcademyLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
          <VaultPlaybookIcon className="h-16 w-16 opacity-10 mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Vault Playbook</h2>
          <p className="text-sm text-white/40 max-w-md">
            The Trading OS playbook is being prepared. Chapters will appear here once configured.
          </p>
        </div>
      </AcademyLayout>
    );
  }

  return (
    <AcademyLayout>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/[0.06] space-y-3">
          <AdminActionBar
            title="Playbook Admin"
            permission="manage_content"
            actions={[
              { label: "Replace PDF", disabled: true },
              { label: "Edit Chapters", disabled: true },
            ]}
          />
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <VaultPlaybookIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Vault Playbook</h1>
              <p className="text-xs text-white/30">Your Trading Operating System</p>
            </div>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 min-h-0 flex">
          {/* Left: Chapter list */}
          <div className="w-[260px] shrink-0 border-r border-white/[0.06] overflow-y-auto p-4">
            <PlaybookChapterList
              chapters={chapters}
              progress={progress}
              activeId={activeChapterId}
              unlockedIndex={unlockedIndex}
              onSelect={handleSelectChapter}
              nextChapter={nextChapter}
            />
          </div>

          {/* Center: Reader */}
          <div
            className="min-w-0 p-4 relative transition-all duration-200 ease-in-out"
            style={{
              flex: isExpanded ? "1 1 0%" : "1 1 0%",
              maxWidth: isExpanded ? "1300px" : undefined,
              margin: isExpanded ? "0 auto" : undefined,
              width: isExpanded ? "95%" : undefined,
            }}
          >
            {/* Expand/Collapse toggle */}
            <button
              onClick={() => setIsExpanded((v) => !v)}
              aria-label={isExpanded ? "Exit expanded view" : "Expand reader"}
              className="absolute top-6 right-6 z-30 h-8 w-8 flex items-center justify-center rounded-lg bg-black/50 backdrop-blur-sm border border-white/[0.08] text-white/40 hover:text-foreground hover:bg-white/[0.08] transition-colors"
              title={isExpanded ? "Exit expanded view (Esc)" : "Expand reader"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {activeChapter ? (
              <PlaybookReader
                key={activeChapter.id}
                chapter={activeChapter}
                progress={progress[activeChapter.id]}
                pdfUrl={pdfUrl}
                pdfLoading={pdfLoading}
                pdfError={pdfError}
                isLocked={isLocked}
                onPageChange={handlePageChange}
                onReachedEnd={handleReachedEnd}
                isAdmin={isAdmin}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white/20">
                Select a chapter
              </div>
            )}
          </div>

          {/* Right: Notes + Checkpoint + Progress */}
          <div
            className={`shrink-0 border-l border-white/[0.06] overflow-y-auto p-4 transition-all duration-200 ease-in-out ${
              isExpanded ? "w-0 opacity-0 overflow-hidden p-0 border-l-0" : "w-[300px] opacity-100"
            }`}
          >
            {activeChapter && !isExpanded && (
              <PlaybookRightPanel
                chapter={activeChapter}
                chProgress={progress[activeChapter.id]}
                chapters={chapters}
                progress={progress}
                onUpdateProgress={updateProgress}
                isLocked={isLocked}
                unlockedIndex={unlockedIndex}
                reachedEnd={reachedEnd}
                onGoToUnlocked={handleGoToUnlocked}
              />
            )}
          </div>
        </div>
      </div>
    </AcademyLayout>
  );
};

export default AcademyPlaybook;
