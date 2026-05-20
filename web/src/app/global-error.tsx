"use client";

import { useEffect } from "react";

// Root-level boundary. Replaces <html> on unrecoverable crash.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[shadow:global-error]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: "#0B0B10",
          color: "#F2EEE6",
          fontFamily: "system-ui, -apple-system, sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 1rem" }}>
            Shadow crashed.
          </h1>
          <p
            style={{
              color: "#9892A1",
              fontSize: "0.875rem",
              margin: "0 0 1.5rem",
            }}
          >
            {error.message || "Unrecoverable root error."}
          </p>
          {error.digest ? (
            <p
              style={{
                color: "#5E5867",
                fontSize: "0.625rem",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                margin: "0 0 1.5rem",
              }}
            >
              ref: {error.digest}
            </p>
          ) : null}
          <button
            onClick={() => reset()}
            style={{
              backgroundColor: "#1C1C26",
              color: "#F2EEE6",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
