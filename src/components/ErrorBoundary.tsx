import React from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell" style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center", padding: 48, maxWidth: 440 }}>
            <div style={{ marginBottom: 20, color: "var(--accent-vermilion)" }}>
              <AlertTriangle size={48} strokeWidth={1.5} />
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 12 }}>
              Đã xảy ra lỗi
            </h2>
            <p style={{ color: "var(--col-ink-2)", lineHeight: 1.6, marginBottom: 24 }}>
              Ứng dụng gặp sự cố không mong muốn. Bạn có thể thử tải lại trang.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
              style={{ padding: "10px 24px" }}
            >
              Tải lại trang
            </button>
            {this.state.error && (
              <details style={{ marginTop: 24, textAlign: "left" }}>
                <summary style={{ cursor: "pointer", color: "var(--col-ink-3)", fontSize: 12 }}>
                  Chi tiết lỗi
                </summary>
                <pre style={{
                  marginTop: 8,
                  padding: 12,
                  background: "var(--col-paper-2)",
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  color: "var(--col-ink-2)",
                  overflow: "auto",
                  maxHeight: 200,
                }}>
                  {this.state.error.message}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
