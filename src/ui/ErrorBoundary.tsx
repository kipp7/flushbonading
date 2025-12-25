import React from "react";
import { buildDiagnosticsText } from "../lib/diagnostics";
import { downloadText } from "../lib/export";

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
  componentStack?: string;
};

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ error, componentStack: info.componentStack ?? undefined });
    console.error("PinForge runtime error:", error, info);
  }

  private exportDiagnostics = () => {
    const text = buildDiagnosticsText({
      appName: typeof __PINFORGE_NAME__ !== "undefined" ? __PINFORGE_NAME__ : "PinForge",
      appVersion: typeof __PINFORGE_VERSION__ !== "undefined" ? __PINFORGE_VERSION__ : "0.0.0",
      buildTime:
        typeof __PINFORGE_BUILD_TIME__ !== "undefined" ? (__PINFORGE_BUILD_TIME__ ?? undefined) : undefined,
      mode: typeof import.meta !== "undefined" ? import.meta.env.MODE : undefined,
      platform: navigator.platform,
      language: navigator.language,
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      error: this.state.error
        ? { message: this.state.error.message, stack: this.state.error.stack, componentStack: this.state.componentStack }
        : undefined,
    });
    downloadText("pinforge_diagnostics.txt", text, "text/plain");
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fatal-shell">
        <div className="fatal-card">
          <p className="fatal-title">PinForge crashed</p>
          <p className="fatal-subtitle">A runtime error occurred. You can export diagnostics for debugging.</p>
          <div className="fatal-actions">
            <button className="btn" onClick={this.exportDiagnostics}>
              Export Diagnostics
            </button>
            <button className="btn outline" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
          <pre className="fatal-details">{this.state.error.stack ?? this.state.error.message}</pre>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
