import { ReactNode, useState, useEffect } from "react";
import { X, Minus, Square, Maximize2, Minimize2 } from "lucide-react";
import { xp } from "./xp-styles";

const WINDOW_SIZE_KEY = "vault_xp_window_maximized";

interface XPWindowProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  menuBar?: boolean;
  className?: string;
  footer?: ReactNode;
  /** Enable viewport-aware sizing with maximize/restore */
  fitViewport?: boolean;
}

export function XPWindow({ title, children, onClose, menuBar, className = "", footer, fitViewport }: XPWindowProps) {
  const [maximized, setMaximized] = useState(() => {
    if (!fitViewport) return false;
    try { return localStorage.getItem(WINDOW_SIZE_KEY) === "true"; } catch { return false; }
  });

  useEffect(() => {
    if (!fitViewport) return;
    try { localStorage.setItem(WINDOW_SIZE_KEY, String(maximized)); } catch {}
  }, [maximized, fitViewport]);

  const toggleMaximize = () => setMaximized((p) => !p);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Viewport-aware styles — no maxHeight on mobile to prevent scroll trapping
  const containerStyle: React.CSSProperties = fitViewport
    ? {
        border: `1px solid ${xp.windowBorder}`,
        background: xp.windowBg,
        ...(isMobile
          ? {}
          : {
              maxHeight: maximized ? "calc(100vh - 80px)" : "calc(100vh - 140px)",
              display: "flex",
              flexDirection: "column" as const,
            }),
      }
    : {
        border: `1px solid ${xp.windowBorder}`,
        background: xp.windowBg,
      };

  const widthClass = fitViewport
    ? maximized
      ? "w-full max-w-[980px]"
      : "w-full max-w-[800px]"
    : "";

  return (
    <div
      className={`rounded-lg overflow-hidden shadow-2xl ${widthClass} ${className}`}
      style={containerStyle}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-2 py-1.5 select-none shrink-0"
        style={{ background: xp.titleBar }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-white/20 flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">V</span>
          </div>
          <span className="text-xs font-semibold text-white truncate">{title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="w-5 h-4 rounded-sm flex items-center justify-center hover:bg-white/20 transition-colors" aria-label="Minimize">
            <Minus className="w-3 h-3 text-white" />
          </button>
          {fitViewport ? (
            <button
              onClick={toggleMaximize}
              className="w-5 h-4 rounded-sm flex items-center justify-center hover:bg-white/20 transition-colors"
              aria-label={maximized ? "Restore" : "Maximize"}
            >
              {maximized ? <Minimize2 className="w-2.5 h-2.5 text-white" /> : <Maximize2 className="w-2.5 h-2.5 text-white" />}
            </button>
          ) : (
            <button className="w-5 h-4 rounded-sm flex items-center justify-center hover:bg-white/20 transition-colors" aria-label="Maximize">
              <Square className="w-2.5 h-2.5 text-white" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-5 h-4 rounded-sm flex items-center justify-center bg-red-500/80 hover:bg-red-500 transition-colors"
              aria-label="Close"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Menu bar — hidden on mobile */}
      {menuBar && (
        <div
          className="hidden md:flex items-center gap-3 px-3 py-1 text-[11px] text-muted-foreground shrink-0"
          style={{ background: xp.menuBg, borderBottom: xp.menuBorder }}
        >
          <span className="hover:text-foreground cursor-default">File</span>
          <span className="hover:text-foreground cursor-default">View</span>
          <span className="hover:text-foreground cursor-default">Tools</span>
          <span className="hover:text-foreground cursor-default">Help</span>
        </div>
      )}

      {/* Body — scrollable on desktop, natural flow on mobile */}
      <div
        className={
          fitViewport
            ? "p-3 md:p-4 space-y-3 md:overflow-y-auto md:flex-1 md:min-h-0 xp-scroll"
            : "p-4 md:p-5 space-y-4"
        }
      >
        {children}
      </div>

      {/* Footer — hidden on mobile */}
      {footer && (
        <div
          className="hidden md:block px-4 py-2 text-[10px] text-muted-foreground shrink-0"
          style={{ borderTop: xp.menuBorder, background: xp.menuBg }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
