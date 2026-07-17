import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global React Error Boundary for the Alankaran CMS Administrative Portal.
 * Prevents the entire application from crashing due to localized component or rendering errors.
 */
export class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[AdminErrorBoundary] Uncaught component error:", error, errorInfo);
    }
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[70vh] flex items-center justify-center p-6 bg-nizami-dark text-stone-200 select-none">
          <Card className="max-w-md w-full bg-black/40 border-gold/30 p-8 text-center rounded-2xl shadow-2xl backdrop-blur-md">
            <div className="size-14 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 mx-auto mb-6">
              <AlertCircle className="size-7 animate-pulse" />
            </div>

            <h1 className="font-serif text-2xl text-stone-100 font-normal mb-2">
              Module Encountered an Issue
            </h1>
            <p className="font-sans text-xs text-stone-400 leading-relaxed mb-6">
              An unexpected error occurred while rendering this CMS component. The rest of your application remains secure and functional.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="p-3 mb-6 rounded-lg bg-stone-900/80 border border-stone-800 text-left overflow-x-auto text-[11px] font-mono text-red-300 max-h-32">
                {this.state.error.message || this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto bg-gold text-stone-950 hover:bg-gold-hover text-xs font-sans font-semibold px-5 h-9 gap-2"
              >
                <RefreshCw className="size-3.5" />
                <span>Reload Page</span>
              </Button>
              <a
                href={ROUTES.ADMIN.DASHBOARD}
                className="w-full sm:w-auto inline-flex items-center justify-center h-9 px-5 rounded-md border border-stone-800 bg-stone-900/60 text-xs font-sans text-stone-300 hover:text-gold transition-colors gap-2"
              >
                <Home className="size-3.5" />
                <span>Return to Dashboard</span>
              </a>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
export default AdminErrorBoundary;
