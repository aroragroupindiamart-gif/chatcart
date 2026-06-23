import React from "react";

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="max-w-lg w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-destructive/10 flex items-center justify-center shrink-0">
                <span className="text-destructive text-lg font-bold">!</span>
              </div>
              <div>
                <h1 className="text-lg font-semibold">Something went wrong</h1>
                <p className="text-sm text-muted-foreground">
                  The admin panel encountered an unexpected error.
                </p>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4 font-mono text-xs text-destructive overflow-auto max-h-48">
              {this.state.error?.message ?? "Unknown error"}
              {this.state.error?.stack && (
                <pre className="mt-2 text-muted-foreground whitespace-pre-wrap">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
            <button
              className="text-sm text-primary underline underline-offset-2 hover:opacity-80"
              onClick={() => window.location.reload()}
            >
              Reload the page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
