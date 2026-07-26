import { useEffect, useState } from 'react';
import { fetchMomentumAnalysis } from '@/services/apiService';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Skeleton } from '@/ui/section';

export function MatchMomentum({ match }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!match || match.status === 'upcoming') {
      setLoading(false);
      setData(null);
      return;
    }
    setLoading(true);
    fetchMomentumAnalysis(match)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [match]);

  const teamA = Math.max(
    5,
    Math.min(95, Number(data?.probA ?? data?.momentum ?? match?.momentum ?? 50))
  );
  const teamB = Math.max(
    5,
    Math.min(95, Number(data?.probB ?? (100 - teamA)))
  );
  const keyMoments = Array.isArray(data?.keyMoments) ? data.keyMoments.slice(0, 3) : [];

  if (match?.status === 'upcoming') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Momentum engine</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            Live win probability unlocks once kickoff or toss begins. Use the AI pre-match brief meanwhile.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Momentum engine</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-muted">
              <span>{match.teamA?.name}</span>
              <span>{match.teamB?.name}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full">
              <div className="bg-accent transition-all" style={{ width: `${teamA}%` }} />
              <div className="bg-surface-3 transition-all" style={{ width: `${teamB}%` }} />
            </div>
            <p className="font-data text-sm text-muted">
              {Math.round(teamA)}% / {Math.round(teamB)}% win probability
            </p>
            {data?.momentum_team && (
              <p className="text-xs text-accent">Momentum with {data.momentum_team}</p>
            )}
            {data?.unavailable ? (
              <p className="text-sm text-muted">Momentum analysis is temporarily unavailable.</p>
            ) : data?.summary ? (
              <p className="text-sm text-muted">{data.summary}</p>
            ) : null}
            {keyMoments.length > 0 && (
              <ul className="space-y-1 border-t border-border-subtle pt-3 text-xs text-muted">
                {keyMoments.map((m, i) => (
                  <li key={i}>· {typeof m === 'string' ? m : m.label || m.text || m.title}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
