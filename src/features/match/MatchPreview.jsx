import { useEffect, useState } from 'react';
import { apiUrl } from '@/config/apiBase';
import { buildMatchContext } from '@/services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/section';
import { cn } from '@/lib/utils';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const FORM_STYLES = {
  W: 'bg-win/15 text-win border-win/30',
  D: 'bg-surface-3 text-muted border-border',
  L: 'bg-live/15 text-live border-live/30',
};

function FormBadges({ form }) {
  const list = Array.isArray(form) && form.length ? form : [];
  if (!list.length) return <span className="text-xs text-muted">No recent form data</span>;
  return (
    <div className="flex gap-1">
      {list.slice(0, 5).map((result, i) => {
        const key = String(result || '').toUpperCase().charAt(0);
        return (
          <span
            key={i}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold',
              FORM_STYLES[key] || 'bg-surface-3 text-muted border-border'
            )}
          >
            {key}
          </span>
        );
      })}
    </div>
  );
}

export function MatchPreview({ match }) {
  const [data, setData] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!match) return;
    setLoading(true);
    setAuthRequired(false);
    try {
      const context = buildMatchContext(match);
      const res = await fetch(apiUrl('/api/ai/preview'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ matchContext: context }),
      });
      if (res.status === 401) {
        setAuthRequired(true);
        setData(null);
        return;
      }
      const result = await res.json();
      if (!res.ok || result.error || result.fallback) {
        setData({ unavailable: true });
        return;
      }
      setData(result);
    } catch {
      setData({ unavailable: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [match?.id]);

  const teamAName = match?.teamA?.name || 'Team A';
  const teamBName = match?.teamB?.name || 'Team B';

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">🧠 AI pre-match preview</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </CardContent>
      </Card>
    );
  }

  if (authRequired) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">🧠 AI pre-match preview</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Sign in to unlock AI win probability, form, and head-to-head analysis for this match.</p>
          <Button className="mt-3" size="sm" onClick={() => document.dispatchEvent(new CustomEvent('esd:open-login'))}>
            Sign in
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.unavailable) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">🧠 AI pre-match preview</CardTitle>
          <Button variant="ghost" size="sm" onClick={load}>Retry</Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Pre-match preview is temporarily unavailable. Check back closer to kickoff.</p>
        </CardContent>
      </Card>
    );
  }

  const pA = data.winProbability?.teamA ?? 50;
  const pB = data.winProbability?.teamB ?? 50;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">🧠 AI pre-match preview</CardTitle>
        <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted">
            <span>{teamAName} · {pA}%</span>
            <span>{teamBName} · {pB}%</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full">
            <div className="bg-accent transition-all" style={{ width: `${pA}%` }} />
            <div className="bg-surface-3 transition-all" style={{ width: `${pB}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">{teamAName} form</p>
            <FormBadges form={data.teamAForm} />
          </div>
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-wide text-muted">{teamBName} form</p>
            <FormBadges form={data.teamBForm} />
          </div>
        </div>

        {data.headToHead && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">⚔️ Head-to-head</p>
            <p className="text-sm text-foreground">{data.headToHead}</p>
          </div>
        )}

        {Array.isArray(data.keyMatchups) && data.keyMatchups.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">🎯 Key matchups</p>
            <ul className="space-y-1 text-sm text-muted">
              {data.keyMatchups.map((m, i) => <li key={i}>• {m}</li>)}
            </ul>
          </div>
        )}

        {data.summary && (
          <div className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2.5 text-sm text-foreground">
            {data.summary}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
