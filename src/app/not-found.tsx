import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 20, padding: 32, textAlign: 'center' }}>
      <span style={{ fontSize: 56 }}>🔍</span>
      <h2 style={{ fontSize: 24, fontWeight: 800 }}>Page Not Found</h2>
      <p style={{ color: 'var(--text-secondary)' }}>The page you are looking for doesn't exist.</p>
      <Link href="/" className="btn btn-primary">Go Home</Link>
    </div>
  );
}
