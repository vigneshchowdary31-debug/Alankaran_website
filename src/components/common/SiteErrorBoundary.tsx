import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export interface SiteErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export interface SiteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Phase 4 Enterprise Public Website Error Boundary.
 * Guarantees that if a CMS payload, network connection, or dynamic image fails to render,
 * the public website never crashes or shows a white screen. Instead, it gracefully displays
 * fallback layout or local bundled images (`Task 4 Offline & Error Fallback`).
 */
export class SiteErrorBoundary extends Component<SiteErrorBoundaryProps, SiteErrorBoundaryState> {
  constructor(props: SiteErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SiteErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.warn("[SiteErrorBoundary] Caught public website rendering error:", error, errorInfo);
    }
    // Phase 4 Telemetry hook point
    if (typeof window !== "undefined") {
      const win = window as any;
      if (!win.__CMS_ANALYTICS_QUEUE) win.__CMS_ANALYTICS_QUEUE = [];
      win.__CMS_ANALYTICS_QUEUE.push({
        eventId: `err_${Date.now()}`,
        eventType: "fallback_trigger",
        target: "SiteErrorBoundary",
        timestamp: Date.now(),
        details: error.message || "Public website component boundary triggered",
      });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default resilient fallback block matching Alankaran's royal aesthetic without crashing
      return (
        <div className="w-full py-16 px-6 bg-stone-950 text-stone-200 flex flex-col items-center justify-center min-h-[300px] border-y border-stone-900">
          <div className="size-12 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex items-center justify-center text-amber-400 mb-4">
            <AlertTriangle className="size-6" />
          </div>
          <h3 className="font-serif text-xl md:text-2xl text-stone-100 font-normal text-center mb-2">
            Alankaran Wedding Elegance
          </h3>
          <p className="font-sans text-xs md:text-sm text-stone-400 max-w-md text-center mb-6 font-light">
            We experienced a temporary visual interruption while loading live media assets (`Task 4 & 16`). Core navigation and website structure remain fully operational.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gold hover:bg-gold-light text-stone-950 font-sans text-xs font-semibold tracking-wider uppercase transition-colors shadow-lg"
          >
            <RefreshCw className="size-3.5" />
            <span>Reload Media Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SiteErrorBoundary;
