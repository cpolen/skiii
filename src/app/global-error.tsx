'use client';

/**
 * Root error boundary for the entire app.
 * Without this, any unhandled React rendering error in Next.js App Router
 * triggers a full page reload. This catches those errors and shows a
 * recovery UI instead, preserving browser state (map position, etc.).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ padding: 20, fontFamily: 'system-ui' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#666', fontSize: 14 }}>{error.message}</p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 12,
              padding: '8px 16px',
              backgroundColor: '#2563EB',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
