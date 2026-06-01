import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);

    // Stale-deploy chunk-hash mismatch: auto-reload once instead of
    // showing the user a dead-end error card.
    const msg = error?.message ?? "";
    const isChunkError =
      /Importing a module script failed/i.test(msg) ||
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /Loading chunk [\d]+ failed/i.test(msg) ||
      /ChunkLoadError/i.test(msg) ||
      error?.name === "ChunkLoadError";

    if (isChunkError) {
      try {
        const RELOAD_KEY = "__lazy_chunk_reloaded__";
        if (sessionStorage.getItem(RELOAD_KEY) !== "1") {
          sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="text-center max-w-md space-y-4">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-destructive/10 mx-auto">
              <svg className="h-7 w-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => {
                try { sessionStorage.removeItem("__lazy_chunk_reloaded__"); } catch { /* ignore */ }
                window.location.reload();
              }}
              className="inline-block text-sm text-primary hover:underline mt-2"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
