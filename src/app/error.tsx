'use client';

/**
 * Route-level error boundary.
 * Catches React rendering errors in the route segment and shows a recovery UI
 * instead of letting the error propagate to global-error (which replaces the
 * entire page including layout). This preserves the <html>/<body> layout.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Route error caught:', error);
  return (
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
  );
}
