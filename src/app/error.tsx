"use client";

import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Also log to console for completeness
    console.error("[ErrorBoundary] caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-5">
      <div className="card max-w-2xl w-full p-6">
        <h1 className="text-2xl font-extrabold mb-2">Something broke</h1>
        <p className="text-text-soft mb-4 text-sm">
          The app threw an exception. The full error is below — copy and send it for diagnosis.
        </p>

        <div className="mb-3">
          <div className="text-xs font-extrabold uppercase tracking-wide text-text-soft mb-1">Message</div>
          <pre className="bg-[#fff0f0] border border-red text-text rounded-lg p-3 text-sm whitespace-pre-wrap break-words">
            {error.message || "(no message)"}
          </pre>
        </div>

        {error.digest && (
          <div className="mb-3">
            <div className="text-xs font-extrabold uppercase tracking-wide text-text-soft mb-1">Digest</div>
            <code className="bg-card-soft border border-border rounded px-2 py-1 text-xs font-mono">{error.digest}</code>
          </div>
        )}

        {error.stack && (
          <div className="mb-4">
            <div className="text-xs font-extrabold uppercase tracking-wide text-text-soft mb-1">Stack</div>
            <pre className="bg-card-soft border border-border text-text rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-words max-h-96 overflow-auto">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={reset}>Try again</button>
          <button className="btn btn-ghost" onClick={() => (window.location.href = "/app")}>Go home</button>
        </div>
      </div>
    </div>
  );
}
