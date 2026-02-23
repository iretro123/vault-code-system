import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, BookOpen, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const notifiedEnd = useRef(false);

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
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground/80">
            Page {localPage} / {totalPages}
          </p>
          <p className="text-[10px] text-white/25">~{chapter.minutes_estimate} min</p>
        </div>
      </div>

      {/* PDF single page */}
      <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center bg-black/20 py-4">
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
            width={680}
            renderTextLayer={true}
            renderAnnotationLayer={true}
          />
        </Document>
      </div>

      {/* Nav controls */}
      <div className="px-6 py-3 border-t border-white/[0.06] flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goPrev}
          disabled={currentPage <= chapter.pdf_page_start}
          className="gap-1.5 text-white/50 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>

        <div className="flex items-center gap-1">
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
