import { ReactNode } from "react";
import { X, Minus, Square } from "lucide-react";
import { xp } from "./xp-styles";

interface XPWindowProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  menuBar?: boolean;
  className?: string;
  footer?: ReactNode;
}

export function XPWindow({ title, children, onClose, menuBar, className = "", footer }: XPWindowProps) {
  return (
    <div
      className={`rounded-lg overflow-hidden shadow-2xl ${className}`}
      style={{ border: `1px solid ${xp.windowBorder}`, background: xp.windowBg }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-2 py-1.5 select-none"
        style={{ background: xp.titleBar }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-white/20 flex items-center justify-center">
            <span className="text-[8px] font-bold text-white">V</span>
          </div>
          <span className="text-xs font-semibold text-white truncate">{title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="w-5 h-4 rounded-sm flex items-center justify-center hover:bg-white/20 transition-colors">
            <Minus className="w-3 h-3 text-white" />
          </button>
          <button className="w-5 h-4 rounded-sm flex items-center justify-center hover:bg-white/20 transition-colors">
            <Square className="w-2.5 h-2.5 text-white" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="w-5 h-4 rounded-sm flex items-center justify-center bg-red-500/80 hover:bg-red-500 transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Menu bar */}
      {menuBar && (
        <div
          className="flex items-center gap-3 px-3 py-1 text-[11px] text-muted-foreground"
          style={{ background: xp.menuBg, borderBottom: xp.menuBorder }}
        >
          <span className="hover:text-foreground cursor-default">File</span>
          <span className="hover:text-foreground cursor-default">View</span>
          <span className="hover:text-foreground cursor-default">Tools</span>
          <span className="hover:text-foreground cursor-default">Help</span>
        </div>
      )}

      {/* Body */}
      <div className="p-4 md:p-5 space-y-4">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div
          className="px-4 py-2.5 text-[10px] text-muted-foreground"
          style={{ borderTop: xp.menuBorder, background: xp.menuBg }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
