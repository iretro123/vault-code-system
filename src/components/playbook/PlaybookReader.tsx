import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, BookOpen, Loader2, AlertTriangle, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { PlaybookChapter, ChapterProgress } from "@/hooks/usePlaybookProgress";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Props {
  chapter: PlaybookChapter;
  progress?: ChapterProgress;
  pdfUrl: string | null;
  pdfLoading: boolean;
  pdfError: string | null;
  isLocked: boolean;
  onPageChange: (page: number) => void;
  onReachedEnd: () => void;
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
  const [pdfWidth, setPdfWidth] = useState(isMobile ? window.innerWidth - 32 : 680);
  const notifiedEnd = useRef(false);

  // Responsive width on mobile
  useEffect(() => {
    if (!isMobile) return;
    const handleResize = () => setPdfWidth(window.innerWidth - 32);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isMobile]);

  // Reset page when chapter changes
  useEffect(() => {
    const page = getInitialPage();
    setCurrentPage(page);
    setDocLoaded(false);
    notifiedEnd.current = false;
  }, [chapter.id]);

  const localPage = currentPage - chapter.pdf_page_start + 1;

  const goNext = useCallback(() => {
    if (currentPage < chapter.pdf_page_end) {
      const next = currentPage + 1;
      setCurrentPage(next);
      onPageChange(next);
      if (next === chapter.pdf_page_end && !notifiedEnd.current) {
        notifiedEnd.current = true;
        onReachedEnd();
      }
    }
  }, [currentPage, chapter.pdf_page_end, onPageChange, onReachedEnd]);

  const goPrev = useCallback(() => {
    if (currentPage > chapter.pdf_page_start) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      onPageChange(prev);
    }
  }, [currentPage, chapter.pdf_page_start, onPageChange]);

  // Notify end on mount if already at end
  useEffect(() => {
    if (currentPage === chapter.pdf_page_end && !notifiedEnd.current) {
      notifiedEnd.current = true;
      onReachedEnd();
    }
  }, [currentPage, chapter.pdf_page_end]);

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
    <div className="vault-glass-card overflow-hidden flex flex-col h-full">
      {/* Chapter header */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/25 font-bold mb-0.5">
            {isLocked ? "Preview Mode" : "Reading"}
          </p>
          <h2 className="text-lg font-bold text-foreground leading-tight">{chapter.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground/80">
              Page {localPage} / {totalPages}
            </p>
            <p className="text-[10px] text-white/25">~{chapter.minutes_estimate} min</p>
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

      {/* Zoom controls — hidden on mobile (use pinch-to-zoom) */}
      <div className="flex-1 min-h-0 relative">
        {!isMobile && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-sm border border-border px-1.5 py-1">
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
        <div className="overflow-auto h-full flex items-start justify-center bg-black/20 py-4">
          <div
            style={isMobile ? undefined : {
              transform: `scale(${zoom / 100})`,
              transformOrigin: "top center",
            }}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={() => setDocLoaded(true)}
              onLoadError={(err) => console.error("PDF load error:", err)}
              loading={
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                width={isMobile ? pdfWidth : 680}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </div>
      </div>

      {/* Nav controls */}
      <div className="px-6 py-3 border-t border-white/[0.06] flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={currentPage <= chapter.pdf_page_start}
            className="gap-1.5 text-white/50 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>

          <span className="text-xs font-semibold text-foreground/70">
            Page {localPage} of {totalPages}
          </span>

          <Button
            variant="ghost"
            size="sm"
            onClick={goNext}
            disabled={currentPage >= chapter.pdf_page_end}
            className="gap-1.5 text-white/50 hover:text-foreground"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1">
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

      {/* Admin debug */}
      {isAdmin && (
        <div className="px-4 py-1.5 border-t border-white/[0.06] text-[10px] text-white/20 font-mono">
          PDF loaded: {docLoaded ? "true" : "false"} · Page: {currentPage} · Range: {chapter.pdf_page_start}–{chapter.pdf_page_end}
        </div>
      )}
    </div>
  );
}

export const PlaybookReader = memo(PlaybookReaderInner);
