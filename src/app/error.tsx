'use client';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 20, padding: 32, textAlign: 'center' }}>
      <span style={{ fontSize: 56 }}>🚨</span>
      <h2 style={{ fontSize: 24, fontWeight: 800 }}>Something went wrong!</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>{error.message || 'A fatal error occurred during hydration or rendering.'}</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
        <button className="btn btn-outline" onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    </div>
  );
}
