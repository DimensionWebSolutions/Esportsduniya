import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

const STYLES = {
  page: { maxWidth: 420, margin: '0 auto', padding: 'calc(var(--island-height, 60px) + 48px) 20px 80px', color: '#e0e0e0' },
  h1: { fontSize: '1.6rem', marginBottom: 8, color: 'var(--accent-cyber, #1ee6a7)' },
  input: { width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.95rem', marginBottom: 12, boxSizing: 'border-box' },
  btn: { width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: 'var(--accent-cyber, #1ee6a7)', color: '#000', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' },
  msg: { padding: '12px', borderRadius: 8, marginBottom: 16, fontSize: '0.9rem' },
  backLink: { display: 'inline-block', marginBottom: 24, color: 'var(--accent-cyber, #1ee6a7)', textDecoration: 'none' },
};

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setStatus({ ok: true, msg: data.message || 'Check your email for the reset link.' });
    } catch {
      setStatus({ ok: false, msg: 'Network error. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <div style={STYLES.page}>
      <Link to="/" style={STYLES.backLink}>← Home</Link>
      <h1 style={STYLES.h1}>Forgot Password</h1>
      <p style={{ marginBottom: 24, color: '#aaa' }}>Enter your verified email address and we'll send you a reset link.</p>

      {status && (
        <div style={{ ...STYLES.msg, background: status.ok ? 'rgba(30,230,167,0.1)' : 'rgba(255,60,60,0.1)', color: status.ok ? '#1ee6a7' : '#ff6060' }}>
          {status.msg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required style={STYLES.input} />
        <button type="submit" disabled={loading} style={{ ...STYLES.btn, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
    </div>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return setStatus({ ok: false, msg: 'Passwords do not match.' });
    if (password.length < 6) return setStatus({ ok: false, msg: 'Password must be at least 6 characters.' });

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      setStatus({ ok: res.ok, msg: data.message || data.error });
    } catch {
      setStatus({ ok: false, msg: 'Network error. Please try again.' });
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <div style={STYLES.page}>
        <Link to="/" style={STYLES.backLink}>← Home</Link>
        <h1 style={STYLES.h1}>Invalid Link</h1>
        <p>This password reset link is invalid. <Link to="/forgot-password" style={{ color: '#1ee6a7' }}>Request a new one</Link>.</p>
      </div>
    );
  }

  return (
    <div style={STYLES.page}>
      <Link to="/" style={STYLES.backLink}>← Home</Link>
      <h1 style={STYLES.h1}>Reset Password</h1>

      {status && (
        <div style={{ ...STYLES.msg, background: status.ok ? 'rgba(30,230,167,0.1)' : 'rgba(255,60,60,0.1)', color: status.ok ? '#1ee6a7' : '#ff6060' }}>
          {status.msg}
          {status.ok && <div style={{ marginTop: 8 }}><Link to="/" style={{ color: '#1ee6a7' }}>Go to Home →</Link></div>}
        </div>
      )}

      {!status?.ok && (
        <form onSubmit={handleSubmit}>
          <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required style={STYLES.input} />
          <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={STYLES.input} />
          <button type="submit" disabled={loading} style={{ ...STYLES.btn, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE}/api/verify-email?token=${token}`)
      .then(r => r.json())
      .then(data => setStatus({ ok: !data.error, msg: data.message || data.error }))
      .catch(() => setStatus({ ok: false, msg: 'Verification failed. Please try again.' }))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div style={STYLES.page}>
      <Link to="/" style={STYLES.backLink}>← Home</Link>
      <h1 style={STYLES.h1}>Email Verification</h1>
      {loading && <p>Verifying your email...</p>}
      {!loading && !token && <p>Invalid verification link.</p>}
      {status && (
        <div style={{ ...STYLES.msg, background: status.ok ? 'rgba(30,230,167,0.1)' : 'rgba(255,60,60,0.1)', color: status.ok ? '#1ee6a7' : '#ff6060' }}>
          {status.msg}
          {status.ok && <div style={{ marginTop: 8 }}><Link to="/" style={{ color: '#1ee6a7' }}>Go to Home →</Link></div>}
        </div>
      )}
    </div>
  );
}
