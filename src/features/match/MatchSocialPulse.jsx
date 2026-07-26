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

const LABEL_COLOR = {
  HYPED: 'text-accent',
  OPTIMISTIC: 'text-accent',
  TENSE: 'text-amber-400',
  FRUSTRATED: 'text-live',
  ANGRY: 'text-live',
};

const REACTION_ICON = { positive: '🚀', negative: '⚠️', neutral: '💬' };

export function MatchSocialPulse({ match }) {
  const [data, setData] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!match) return;
    setLoading(true);
    setAuthRequired(false);
    try {
      const res = await fetch(apiUrl('/api/ai/social-sentiment'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ matchContext: buildMatchContext(match) }),
      });
      if (res.status === 401) {
        setAuthRequired(true);
        setData(null);
        return;
      }
      const result = await res.json();
      if (!res.ok || result.error) {
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

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">𝕏 Social Pulse</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (authRequired) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">𝕏 Social Pulse</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Sign in to see real-time fan sentiment and reactions for this match.</p>
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
          <CardTitle className="text-base">𝕏 Social Pulse</CardTitle>
          <Button variant="ghost" size="sm" onClick={load}>Retry</Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Fan sentiment analysis is temporarily unavailable.</p>
        </CardContent>
      </Card>
    );
  }

  const sentiment = typeof data.sentiment === 'number' ? data.sentiment : 0;
  const pct = ((sentiment + 100) / 200) * 100;
  const colorClass = LABEL_COLOR[data.label] || 'text-accent';

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">𝕏 Social Pulse</CardTitle>
        <Button variant="ghost" size="sm" onClick={load}>Refresh</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline justify-between">
            <span className={cn('font-data text-2xl font-bold', colorClass)}>
              {sentiment > 0 ? '+' : ''}{sentiment}
            </span>
            <span className={cn('text-xs font-semibold uppercase tracking-wide', colorClass)}>
              {data.label || 'NEUTRAL'}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn('h-full transition-all', sentiment >= 0 ? 'bg-accent' : 'bg-live')}
              style={{ width: `${pct}%` }}
            />
          </div>
          {data.summary && <p className="mt-2 text-sm text-muted">{data.summary}</p>}
        </div>

        {Array.isArray(data.reactions) && data.reactions.length > 0 && (
          <div className="space-y-2">
            {data.reactions.slice(0, 5).map((rx, i) => (
              <div key={i} className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2 text-sm">
                <p className="font-medium text-foreground">
                  {rx.user} <span className="ml-1">{REACTION_ICON[rx.type] || '💬'}</span>
                </p>
                <p className="mt-0.5 text-muted">{rx.text}</p>
              </div>
            ))}
          </div>
        )}

        {Array.isArray(data.hashtags) && data.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.hashtags.map((tag, i) => (
              <span key={i} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-accent">
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
