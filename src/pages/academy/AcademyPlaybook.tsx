import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { usePlaybookProgress } from "@/hooks/usePlaybookProgress";
import { useAuth } from "@/hooks/useAuth";
import { useAcademyRole } from "@/hooks/useAcademyRole";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Maximize2, Minimize2, ChevronLeft } from "lucide-react";
import { AdminActionBar } from "@/components/admin/AdminActionBar";
import { VaultPlaybookIcon } from "@/components/icons/VaultPlaybookIcon";
import { PlaybookReader } from "@/components/playbook/PlaybookReader";
import { PlaybookChapterList } from "@/components/playbook/PlaybookChapterList";
import { PlaybookRightPanel } from "@/components/playbook/PlaybookRightPanel";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { PremiumGate } from "@/components/academy/PremiumGate";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { isLocalDesignPreview } from "@/integrations/supabase/localPreviewFetch";

// Module-level signed URL cache
let cachedPdfUrl: string | null = null;
let cachedAt = 0;
let cachedForUser: string | null = null;
const URL_TTL = 50 * 60 * 1000; // 50 min (refresh before 1hr expiry)

const AcademyPlaybook = () => {
  const [searchParams,setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
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
  const [startAtFirstPage,setStartAtFirstPage]=useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mobileReaderOpen, setMobileReaderOpen] = useState(false);
  const [mobileFullscreen, setMobileFullscreen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ESC to exit expanded mode
  useEffect(() => {
    if (!isExpanded && !mobileReaderOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsExpanded(false);
        setMobileReaderOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isExpanded, mobileReaderOpen]);

  // Fetch signed URL with module-level cache
  useEffect(() => {
    if (!user) return;
    const now = Date.now();
    if (cachedPdfUrl && cachedForUser === user.id && now - cachedAt < URL_TTL) {
      setPdfUrl(cachedPdfUrl);
      setPdfLoading(false);
      return;
    }
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
          cachedPdfUrl = data.signedUrl;
          cachedForUser = user.id;
          cachedAt = Date.now();
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
      if (isMobile) setMobileReaderOpen(true);
    } else if (lastChapterId && chapters.find((c) => c.id === lastChapterId)) {
      setActiveChapterId(lastChapterId);
    } else {
      setActiveChapterId(nextChapter?.id || chapters[0].id);
    }
  }, [chapters, lastChapterId]);

  const activeChapter = chapters.find((c) => c.id === activeChapterId);
  const followingChapter=activeChapter?chapters.filter(c=>c.order_index>activeChapter.order_index).sort((a,b)=>a.order_index-b.order_index)[0]:undefined;
  const isLocked = activeChapter
    ? activeChapter.order_index > unlockedIndex &&
      !(progress[activeChapter.id]?.status === "completed" || progress[activeChapter.id]?.checkpoint_passed)
    : false;

  const handleSelectChapter = useCallback(
    (id: string) => {
      setStartAtFirstPage(false);
      setActiveChapterId(id);
      setSearchParams(prev=>{const next=new URLSearchParams(prev);next.set('chapter',id);return next;},{replace:true});
      setReachedEnd(false);
      if (isMobile) setMobileReaderOpen(true);
    },
    [isMobile,setSearchParams]
  );

  const handleNextChapter=()=>{
    if(!followingChapter)return;
    clearTimeout(debounceRef.current);
    setStartAtFirstPage(true);
    setActiveChapterId(followingChapter.id);
    setSearchParams(prev=>{const next=new URLSearchParams(prev);next.set('chapter',followingChapter.id);return next;},{replace:true});
    setReachedEnd(false);
    if(isMobile)setMobileReaderOpen(true);
    // Same chapter access/preview rules as the chapter list; no completion is granted.
  };

  const handlePageChange = useCallback(
    (page: number) => {
      if (!activeChapterId || isLocalDesignPreview()) return;
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

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const checkpointDialog = activeChapter && (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline" className="min-h-11">Study notes</Button></DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto z-[70]">
        <DialogTitle>{activeChapter.title}</DialogTitle>
        <DialogDescription>Review your notes and check what you’ve learned.</DialogDescription>
        {isLocalDesignPreview() && <p className="text-sm text-muted-foreground">Reading preview only. Notes and course progress won’t be saved.</p>}
        <fieldset disabled={isLocalDesignPreview()}>
          <PlaybookRightPanel chapter={activeChapter} chProgress={progress[activeChapter.id]} chapters={chapters} progress={progress} onUpdateProgress={updateProgress} isLocked={isLocked} unlockedIndex={unlockedIndex} reachedEnd={reachedEnd} onGoToUnlocked={handleGoToUnlocked} />
        </fieldset>
      </DialogContent>
    </Dialog>
  );
  const openPdf = pdfUrl && <Button asChild variant="outline" className="min-h-11"><a href={pdfUrl} target="_blank" rel="noopener noreferrer">Open PDF</a></Button>;

  if (!hasAccess && !accessLoading) {
    return (
      <>
        <PremiumGate status={status} pageName="Vault Playbook" />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  if (chapters.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center px-8">
          <VaultPlaybookIcon className="h-16 w-16 opacity-10 mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Vault Playbook</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            The Trading OS playbook is being prepared. Chapters will appear here once configured.
          </p>
        </div>
      </>
    );
  }

  // ── Mobile: Full-screen reader overlay ──
  if (isMobile && mobileReaderOpen && activeChapter) {
    return (
      <>
        <div className={`fixed inset-0 bg-background flex flex-col ${mobileFullscreen ? "z-[60]" : "z-50 pb-[calc(80px+env(safe-area-inset-bottom))]"}`}>
          {/* Mobile reader header — hidden in fullscreen */}
          {!mobileFullscreen && (
            <div className="playbook-mobile-toolbar px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileReaderOpen(false)}
                className="gap-1.5 text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" /> Chapters
              </Button>
              <div className="flex gap-2">{openPdf}{checkpointDialog}</div>
            </div>
          )}

          {/* Full-screen reader */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <PlaybookReader
              chapter={activeChapter}
              progress={startAtFirstPage?undefined:progress[activeChapter.id]}
              onNextChapter={followingChapter?handleNextChapter:undefined}
              nextChapterTitle={followingChapter?.title}
              pdfUrl={pdfUrl}
              pdfLoading={pdfLoading}
              pdfError={pdfError}
              isLocked={isLocked}
              onPageChange={handlePageChange}
              onReachedEnd={handleReachedEnd}
              isAdmin={isAdmin}
              isMobile
              isFullscreen={mobileFullscreen}
              onToggleFullscreen={() => setMobileFullscreen((v) => !v)}
            />
          </div>
        </div>
      </>
    );
  }

  // ── Mobile: Chapter list view ──
  if (isMobile) {
    return (
      <>
        <div className="flex flex-col h-[calc(100vh-64px)]">
          <div className="px-4 py-5 border-b border-border space-y-3">
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
                <p className="text-sm text-muted-foreground">Your trading e-book · {chapters.length} chapters</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <PlaybookChapterList
              chapters={chapters}
              progress={progress}
              activeId={activeChapterId}
              unlockedIndex={unlockedIndex}
              onSelect={handleSelectChapter}
              nextChapter={nextChapter}
            />
          </div>
        </div>
      </>
    );
  }

  // ── Desktop: 3-column layout ──
  return (
    <>
      <div className="h-[calc(100dvh-56px)] flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b border-border space-y-2">
          <AdminActionBar
            title="Playbook Admin"
            permission="manage_content"
            actions={[
              { label: "Replace PDF", disabled: true },
              { label: "Edit Chapters", disabled: true },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <VaultPlaybookIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Vault Playbook</h1>
              <p className="text-sm text-muted-foreground">Your trading e-book · {chapters.length} chapters</p>
            </div>
            <div className="ml-auto flex gap-2">{openPdf}{checkpointDialog}</div>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 min-h-0 flex">
          {/* Left: Chapter list */}
          <div className={`${isExpanded ? "hidden" : "w-[220px] xl:w-[260px]"} shrink-0 border-r border-border overflow-y-auto p-4`}>
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
              flex: "1 1 0%",
              maxWidth: isExpanded ? "1300px" : undefined,
              margin: isExpanded ? "0 auto" : undefined,
              width: isExpanded ? "95%" : undefined,
            }}
          >
            {/* Expand/Collapse toggle */}
            <button style={{display:'none'}}
              onClick={() => setIsExpanded((v) => !v)}
              aria-label={isExpanded ? "Exit expanded view" : "Expand reader"}
              className="absolute top-[88px] left-6 z-30 h-10 w-10 flex items-center justify-center rounded-lg bg-black/80 border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={isExpanded ? "Exit expanded view (Esc)" : "Expand reader"}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {activeChapter ? (
              <PlaybookReader
                chapter={activeChapter}
                progress={startAtFirstPage?undefined:progress[activeChapter.id]}
                onNextChapter={followingChapter?handleNextChapter:undefined}
                nextChapterTitle={followingChapter?.title}
                pdfUrl={pdfUrl}
                pdfLoading={pdfLoading}
                pdfError={pdfError}
                isLocked={isLocked}
                onPageChange={handlePageChange}
                onReachedEnd={handleReachedEnd}
                isAdmin={isAdmin}
                isFullscreen={isExpanded}
                onToggleFullscreen={()=>setIsExpanded(v=>!v)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a chapter
              </div>
            )}
          </div>

          {/* Smaller screens use the checkpoint dialog above. */}
          <fieldset disabled={isLocalDesignPreview()}
            className={`shrink-0 border-l border-border overflow-y-auto p-4 transition-all duration-200 ease-in-out hidden ${
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
          </fieldset>
        </div>
      </div>
    </>
  );
};

export default AcademyPlaybook;
