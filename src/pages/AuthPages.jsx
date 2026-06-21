import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiUrl } from '@/config/apiBase';
import { MarketingLayout } from '@/layouts/PageLayouts';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { cn } from '@/lib/utils';

function StatusMessage({ ok, children }) {
  return (
    <div className={cn('mb-4 rounded-lg border px-4 py-3 text-sm', ok ? 'border-win/30 bg-win/10 text-win' : 'border-live/30 bg-live/10 text-live')}>
      {children}
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setStatus({ ok: true, msg: data.message });
    } catch {
      setStatus({ ok: false, msg: 'Network error.' });
    }
    setLoading(false);
  };

  return (
    <MarketingLayout title="Forgot password" description="Enter your verified email for a reset link.">
      {status && <StatusMessage ok={status.ok}>{status.msg}</StatusMessage>}
      <form onSubmit={handleSubmit} className="not-prose max-w-md space-y-4">
        <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} required />
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'Sending...' : 'Send reset link'}</Button>
      </form>
    </MarketingLayout>
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
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      setStatus({ ok: res.ok, msg: data.message || data.error });
    } catch {
      setStatus({ ok: false, msg: 'Network error.' });
    }
    setLoading(false);
  };

  if (!token) {
    return (
      <MarketingLayout title="Invalid link">
        <p><Link to="/forgot-password" className="text-accent">Request a new reset link</Link></p>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout title="Reset password">
      {status && <StatusMessage ok={status.ok}>{status.msg}{status.ok && <div className="mt-2"><Link to="/" className="underline">Go home</Link></div>}</StatusMessage>}
      {!status?.ok && (
        <form onSubmit={handleSubmit} className="not-prose max-w-md space-y-4">
          <Input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          <Button type="submit" disabled={loading} className="w-full">{loading ? 'Resetting...' : 'Reset password'}</Button>
        </form>
      )}
    </MarketingLayout>
  );
}

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) return;
    fetch(apiUrl(`/api/verify-email?token=${token}`))
      .then(r => r.json())
      .then(data => setStatus({ ok: !data.error, msg: data.message || data.error }))
      .catch(() => setStatus({ ok: false, msg: 'Verification failed.' }))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <MarketingLayout title="Email verification">
      {loading && <p className="text-muted">Verifying...</p>}
      {status && <StatusMessage ok={status.ok}>{status.msg}{status.ok && <div className="mt-2"><Link to="/" className="underline">Go home</Link></div>}</StatusMessage>}
    </MarketingLayout>
  );
}
