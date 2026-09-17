import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorkerUrl from "vault-pdf-worker?url";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, BookOpen, Loader2, AlertTriangle, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { PlaybookChapter, ChapterProgress } from "@/hooks/usePlaybookProgress";
import { cn } from "@/lib/utils";
import './playbook-reader.css';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface Props {
  chapter: PlaybookChapter;
  progress?: ChapterProgress;
  pdfUrl: string | null;
  pdfLoading: boolean;
  pdfError: string | null;
  isLocked: boolean;
  onPageChange: (page: number) => void;
  onReachedEnd: () => void;
  onNextChapter?: () => void;
  nextChapterTitle?: string;
  isAdmin?: boolean;
  isMobile?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function PlaybookReaderInner({
  chapter,
  progress,
  pdfUrl,
  pdfLoading,
  pdfError,
  isLocked,
  onPageChange,
  onReachedEnd,
  onNextChapter,
  nextChapterTitle,
  isAdmin,
  isMobile,
  isFullscreen,
  onToggleFullscreen,
}: Props) {
  const totalPages = chapter.pdf_page_end - chapter.pdf_page_start + 1;

  // Clamp saved page to chapter bounds
  const getInitialPage = () => {
    const saved = progress?.last_page_viewed || 0;
    if (saved >= chapter.pdf_page_start && saved <= chapter.pdf_page_end) {
      return saved;
    }
    return chapter.pdf_page_start;
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [docLoaded, setDocLoaded] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [renderError, setRenderError] = useState(false);
  const [renderedPage,setRenderedPage]=useState<number|null>(null);
  const pageReady=renderedPage===currentPage;
  const setPageReady=(ready:boolean)=>setRenderedPage(ready?currentPage:null);
  const [slowLoad,setSlowLoad]=useState(false);
  const [retry,setRetry]=useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [pdfWidth, setPdfWidth] = useState(isMobile ? window.innerWidth - 32 : 680);
  const notifiedEnd = useRef(false);
  const prevChapterId = useRef(chapter.id);

  // Fit the available reading pane, not a fixed desktop width.
  useEffect(() => {
    const pane = viewportRef.current;
    if (!pane) return;
    const observer = new ResizeObserver(([entry]) => setPdfWidth(Math.max(120, Math.min(900, entry.contentRect.width - 24))));
    observer.observe(pane);
    return () => observer.disconnect();
  }, [pdfUrl, pdfLoading, pdfError]);

  useEffect(() => { setDocLoaded(false); setRenderError(false);setPageReady(false); }, [pdfUrl,retry]);
  useEffect(()=>{setPageReady(false);setRenderError(false);},[currentPage]);
  useEffect(()=>{setSlowLoad(false);if(pageReady||renderError)return;const timer=setTimeout(()=>setSlowLoad(true),12000);return()=>clearTimeout(timer);},[pageReady,renderError,pdfUrl,retry,currentPage]);
  useEffect(() => { viewportRef.current?.scrollTo({top: 0, left: 0}); }, [currentPage]);

  // Reset state when chapter changes (without remounting)
  useEffect(() => {
    if (prevChapterId.current === chapter.id) return;
    prevChapterId.current = chapter.id;
    const page = getInitialPage();
    setCurrentPage(page);
    notifiedEnd.current = false;
  }, [chapter.id]);

  const localPage = currentPage - chapter.pdf_page_start + 1;

  const goNext = useCallback(() => {
    if(currentPage===chapter.pdf_page_end){onNextChapter?.();return;}
    if (currentPage < chapter.pdf_page_end) {
      const next = currentPage + 1;
      setCurrentPage(next);
      onPageChange(next);
    }
  }, [currentPage, chapter.pdf_page_end, onPageChange, onNextChapter]);

  const goPrev = useCallback(() => {
    if (currentPage > chapter.pdf_page_start) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      onPageChange(prev);
    }
  }, [currentPage, chapter.pdf_page_start, onPageChange]);

  // Notify end on mount if already at end
  useEffect(() => {
    if (pageReady && !renderError && currentPage === chapter.pdf_page_end && !notifiedEnd.current) {
      notifiedEnd.current = true;
      onReachedEnd();
    }
  }, [currentPage, chapter.pdf_page_end, pageReady, renderError,onReachedEnd]);

  if (pdfLoading) {
    return (
      <div className="vault-glass-card flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pdfError) {
    return (
      <div className="vault-glass-card flex flex-col items-center justify-center h-full text-center px-8">
        <AlertTriangle className="h-12 w-12 text-destructive/40 mb-4" />
        <p className="text-sm text-destructive font-medium">{pdfError}</p>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="vault-glass-card flex flex-col items-center justify-center h-full text-center px-8">
        <BookOpen className="h-12 w-12 text-white/10 mb-4" />
        <p className="text-sm text-white/40 font-medium">PDF not uploaded yet</p>
        <p className="text-xs text-white/20 mt-1">
          Upload vault-playbook.pdf to the playbook storage bucket.
        </p>
      </div>
    );
  }

  return (
    <div className="playbook-reader vault-glass-card overflow-hidden flex flex-col h-full">
      {/* Chapter header */}
      <div className={cn("border-b border-white/[0.06] flex items-center justify-between", isMobile ? "px-6 py-4" : "px-4 py-2.5")} style={isMobile ? { touchAction: "manipulation" } : undefined}>
        <div>
          <p className="text-xs uppercase tracking-wide text-white/60 font-bold mb-0.5">
            {isLocked ? "Preview Mode" : "Reading"}
          </p>
          <h2 className="text-lg font-bold text-foreground leading-tight">{chapter.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground/80">
              Page {localPage} / {totalPages}
            </p>
            <p className="text-xs text-white/60">~{chapter.minutes_estimate} min</p>
          </div>
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Zoom controls remain available on touch devices. */}
      <div className="reader-body flex-1 min-h-0 relative">
        {(
          <div className="reader-zoom flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label="Zoom out"
                  onClick={() => setZoom((z) => Math.max(80, z - 10))}
                  disabled={zoom <= 80}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ZoomOut className="h-[15px] w-[15px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Zoom out</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label="Reset zoom"
                  onClick={() => setZoom(100)}
                  className="h-7 min-w-[40px] flex items-center justify-center rounded-full text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors font-mono"
                >
                  {zoom}%
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Reset zoom</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label="Zoom in"
                  onClick={() => setZoom((z) => Math.min(180, z + 10))}
                  disabled={zoom >= 180}
                  className="h-7 w-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ZoomIn className="h-[15px] w-[15px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Zoom in</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Scrollable + zoomable content */}
        <div ref={viewportRef} className="reader-pages overflow-auto bg-black/20" style={{ touchAction: "pan-x pan-y pinch-zoom", overscrollBehavior: "contain" }}>
          {(slowLoad||renderError)&&<div role="status" className="reader-recovery"><p>{renderError?'The e-book could not load.':'This is taking longer than usual.'}</p><Button variant="outline" onClick={()=>setRetry(r=>r+1)}>Try again</Button><a href={pdfUrl} target="_blank" rel="noopener noreferrer">Open PDF instead</a></div>}
          <div
            style={{ width: pdfWidth * zoom / 100, margin: "0 auto" }}
          >
            <Document
              key={`${pdfUrl}-${retry}`}
              file={pdfUrl}
              onLoadSuccess={() => setDocLoaded(true)}
              onLoadError={() => setRenderError(true)}
              error={<div role="alert" className="p-6 text-base text-center">The e-book couldn’t load. Check your connection and reopen the Playbook.</div>}
              loading={
                <div role="status" className="flex flex-col gap-3 items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Opening your e-book…</p>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                width={pdfWidth * zoom / 100}
                onRenderSuccess={()=>setPageReady(true)}
                loading={<p role="status" className="p-8 text-center text-sm text-muted-foreground">Preparing page…</p>}
                onRenderError={() => setRenderError(true)}
                error={<p role="alert" className="p-4">This page couldn’t load. Try another chapter or reopen the e-book.</p>}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </div>
      </div>

      {/* Nav controls */}
      <div className={cn("border-t border-white/[0.06] flex flex-col gap-2 shrink-0", isMobile ? "px-6 py-3" : "px-4 py-2")} style={isMobile ? { touchAction: "manipulation" } : undefined}>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={!pageReady || renderError || currentPage <= chapter.pdf_page_start}
            className="gap-1.5 min-h-11 text-foreground/80 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>

          <label className="reader-page-jump"><span className="sr-only">Go to page</span><select aria-label="Go to page" value={currentPage} disabled={!docLoaded} onChange={e=>{const page=Number(e.target.value);setCurrentPage(page);onPageChange(page);}}>{Array.from({length:totalPages},(_,i)=><option key={i} value={chapter.pdf_page_start+i}>Page {i+1} of {totalPages}</option>)}</select></label>

          <Button
            variant="ghost"
            size="sm"
            onClick={goNext}
            disabled={!pageReady || renderError || (currentPage >= chapter.pdf_page_end&&!onNextChapter)}
            title={currentPage===chapter.pdf_page_end&&nextChapterTitle?`Continue to ${nextChapterTitle}`:undefined}
            className="gap-1.5 min-h-11 text-foreground/80 hover:text-foreground"
          >
            {currentPage===chapter.pdf_page_end?(onNextChapter?'Next chapter':'End of book'):'Next'} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="hidden">
          {Array.from({ length: Math.min(totalPages, 12) }, (_, i) => {
            const pg = chapter.pdf_page_start + i;
            return (
              <div
                key={pg}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  pg === currentPage
                    ? "w-4 bg-primary"
                    : pg <= currentPage
                    ? "w-1.5 bg-primary/30"
                    : "w-1.5 bg-white/10"
                )}
              />
            );
          })}
          {totalPages > 12 && <span className="text-[10px] text-white/20 ml-1">+{totalPages - 12}</span>}
        </div>
      </div>

    </div>
  );
}

export const PlaybookReader = memo(PlaybookReaderInner);
