import { useEffect, useState } from 'react';
import { Brain } from 'lucide-react';
import { fetchPreGamePreview, buildMatchContext } from '@/services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Skeleton } from '@/ui/section';

export default function PreGameBrief({ match }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!match) return;
    let cancelled = false;
    setLoading(true);
    const context = typeof buildMatchContext === 'function' ? buildMatchContext(match) : match;
    fetchPreGamePreview(context)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData({ unavailable: true });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [match?.id]);

  const teamA = match?.teamA?.name || 'Team A';
  const teamB = match?.teamB?.name || 'Team B';
  const probA = data?.winProbability?.teamA ?? 50;
  const probB = data?.winProbability?.teamB ?? 50;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Brain className="h-4 w-4 text-accent" />
        <CardTitle className="text-base">AI pre-match brief</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : data?.unavailable ? (
          <p className="text-sm text-muted">
            Pre-match preview is unavailable right now. Lock a prediction early and check form on Standings.
          </p>
        ) : (
          <>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted">
                <span>{teamA} {probA}%</span>
                <span>{teamB} {probB}%</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded-full">
                <div className="bg-accent transition-all" style={{ width: `${probA}%` }} />
                <div className="bg-surface-3 transition-all" style={{ width: `${probB}%` }} />
              </div>
            </div>

            {(data?.teamAForm || data?.teamBForm || data?.formA || data?.formB) && (
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="mb-1 text-muted">{teamA} form</p>
                  <p className="font-data text-foreground">
                    {(data.teamAForm || data.formA || []).join(' ') || '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="mb-1 text-muted">{teamB} form</p>
                  <p className="font-data text-foreground">
                    {(data.teamBForm || data.formB || []).join(' ') || '—'}
                  </p>
                </div>
              </div>
            )}

            {data?.headToHead && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Head-to-head</p>
                <p className="text-sm text-foreground">{data.headToHead}</p>
              </div>
            )}

            {Array.isArray(data?.keyMatchups) && data.keyMatchups.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Key matchups</p>
                <ul className="space-y-1 text-sm text-muted">
                  {data.keyMatchups.slice(0, 4).map((item, i) => (
                    <li key={i}>· {typeof item === 'string' ? item : item.label || item.text}</li>
                  ))}
                </ul>
              </div>
            )}

            {(data?.summary || data?.analysis) && (
              <p className="text-sm leading-relaxed text-muted">{data.summary || data.analysis}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
