"use client";

// Replaces the root layout when it crashes, so it must render its own
// <html>/<body> and cannot rely on globals.css being present.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="mn">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fafafa",
          color: "#18181b",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
            GereeZ — алдаа гарлаа
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#71717a", maxWidth: "24rem" }}>
            Түр зуурын алдаа гарлаа. Дахин оролдоно уу.
          </p>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#a1a1aa" }}>
              Алдааны код: {error.digest}
            </p>
          )}
          <button
            onClick={() => unstable_retry()}
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "#1e2a4a",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Дахин оролдох
          </button>
        </div>
      </body>
    </html>
  );
}
