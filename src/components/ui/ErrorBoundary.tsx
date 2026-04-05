import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  fallback?: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Minimal error boundary so a single broken view (e.g. the Admin Themes tab)
// doesn't leave the user staring at a black screen.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in the console for diagnostics without alerting the user.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg text-text p-6">
          <div className="max-w-md w-full bg-card rounded-2xl p-5 border border-danger/40">
            <div className="text-3xl mb-2">⚠️</div>
            <div className="text-lg font-bold mb-1">Something broke</div>
            <div className="text-text-muted text-xs mb-3 font-mono break-all">
              {this.state.error.message}
            </div>
            <button
              onClick={this.reset}
              className="px-4 py-2 rounded-lg text-white text-sm font-semibold cursor-pointer"
              style={{ background: "linear-gradient(135deg, #f09848, #e07028)" }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
