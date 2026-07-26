import { useEffect, useState } from 'react';
import { apiUrl } from '@/config/apiBase';
import { buildMatchContext } from '@/services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/section';
import { cn } from '@/lib/utils';

const FORM_STYLES = {
  W: 'border-win/40 bg-win/10 text-win',
  D: 'border-border bg-surface-2 text-muted',
  L: 'border-live/40 bg-live/10 text-live',
};

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function FormRun({ label, form }) {
  const run = Array.isArray(form) ? form.slice(0, 5) : [];
  if (!run.length) return null;
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1.5 flex gap-1">
        {run.map((result, i) => {
          const outcome = String(result).toUpperCase().charAt(0);
          return (
            <span
              key={`${outcome}-${i}`}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-md border font-data text-xs',
                FORM_STYLES[outcome] || FORM_STYLES.D
              )}
            >
              {outcome}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Pre-match form guide for fixtures that have not started yet. */
export function MatchPreview({ match }) {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    if (!match) return;
    let cancelled = false;
    setState({ status: 'loading', data: null });

    (async () => {
      try {
        const res = await fetch(apiUrl('/api/ai/preview'), {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ matchContext: buildMatchContext(match) }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 401) return setState({ status: 'signin', data: null });
        if (!res.ok || data.error || data.unavailable) return setState({ status: 'unavailable', data: null });
        setState({ status: 'ready', data });
      } catch {
        if (!cancelled) setState({ status: 'unavailable', data: null });
      }
    })();

    return () => { cancelled = true; };
  }, [match?.id]);

  const teamA = match?.teamA?.name || 'Team A';
  const teamB = match?.teamB?.name || 'Team B';
  const probA = Math.min(95, Math.max(5, state.data?.winProbability?.teamA ?? 50));
  const probB = 100 - probA;

  const fixtureFacts = [
    match?.league && `Competition: ${match.league}`,
    match?.venue && `Venue: ${match.venue}`,
    match?.minute && `Starts: ${match.minute}`,
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pre-match form guide</CardTitle>
      </CardHeader>
      <CardContent>
        {state.status === 'loading' ? (
          <div className="space-y-3">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : state.status === 'signin' ? (
          <div className="space-y-3 text-sm text-muted">
            <p>Sign in to unlock the form guide: win probability, recent results, head-to-head record and the matchups that decide this one.</p>
            <Button size="sm" onClick={() => document.dispatchEvent(new CustomEvent('esd:open-login'))}>Sign in</Button>
          </div>
        ) : state.status === 'unavailable' ? (
          <div className="space-y-2 text-sm text-muted">
            <p>The form guide is unavailable right now. Here is what we know about this fixture:</p>
            <ul className="space-y-1">
              {fixtureFacts.map(fact => <li key={fact} className="font-data text-xs">{fact}</li>)}
            </ul>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <div className="mb-1.5 flex justify-between text-xs">
                <span className="text-foreground">{teamA} <span className="font-data text-accent">{probA}%</span></span>
                <span className="text-foreground"><span className="font-data text-muted">{probB}%</span> {teamB}</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full">
                <div className="bg-accent" style={{ width: `${probA}%` }} />
                <div className="bg-surface-3" style={{ width: `${probB}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">Modelled win probability before kick-off</p>
            </div>

            {(state.data.teamAForm?.length || state.data.teamBForm?.length) && (
              <div className="grid grid-cols-2 gap-4">
                <FormRun label={`${teamA} form`} form={state.data.teamAForm} />
                <FormRun label={`${teamB} form`} form={state.data.teamBForm} />
              </div>
            )}

            {state.data.headToHead && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Head to head</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{state.data.headToHead}</p>
              </div>
            )}

            {state.data.keyMatchups?.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted">Key matchups</p>
                <ul className="mt-1 space-y-1 text-sm text-muted">
                  {state.data.keyMatchups.slice(0, 4).map(item => (
                    <li key={item} className="flex gap-2">
                      <span className="text-accent">·</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {state.data.summary && (
              <p className="border-t border-border-subtle pt-4 text-sm leading-relaxed text-muted">{state.data.summary}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
