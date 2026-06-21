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
      return;
    }
    setLoading(true);
    fetchMomentumAnalysis(match)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [match]);

  const momentum = data?.momentum ?? match?.momentum ?? 50;
  const teamA = Math.max(5, Math.min(95, momentum));
  const teamB = 100 - teamA;

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
            <p className="font-data text-sm text-muted">{teamA}% / {teamB}% win probability</p>
            {data?.summary && <p className="text-sm text-muted">{data.summary}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
