import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone } from 'lucide-react';
import { apiUrl } from '@/config/apiBase';
import { trackCheerAction } from '@/components/DailyChallenges.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';

export function MatchFanZone({ matchId, teamA, teamB }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['fanzone', matchId],
    queryFn: () => fetch(apiUrl(`/api/fanzone/${encodeURIComponent(matchId)}`), { cache: 'no-store' }).then(r => r.json()),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const onUpdate = (event) => {
      const detail = event.detail || event;
      if (detail?.matchId && String(detail.matchId) !== String(matchId)) return;
      if (detail?.state || detail?.cheers) {
        qc.setQueryData(['fanzone', matchId], detail.state || detail);
      } else {
        qc.invalidateQueries({ queryKey: ['fanzone', matchId] });
      }
    };
    window.addEventListener('lsm:fan_zone_update', onUpdate);
    document.addEventListener('lsm:fan_zone_update', onUpdate);
    return () => {
      window.removeEventListener('lsm:fan_zone_update', onUpdate);
      document.removeEventListener('lsm:fan_zone_update', onUpdate);
    };
  }, [matchId, qc]);

  const cheer = useMutation({
    mutationFn: (team) => fetch(apiUrl(`/api/fanzone/${encodeURIComponent(matchId)}/cheer`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team }),
    }).then(r => r.json()),
    onSuccess: (state) => {
      trackCheerAction();
      qc.setQueryData(['fanzone', matchId], state);
    },
  });

  const cheersA = data?.cheers?.teamA ?? data?.teamA ?? 0;
  const cheersB = data?.cheers?.teamB ?? data?.teamB ?? 0;
  const total = cheersA + cheersB || 1;
  const pctA = Math.round((cheersA / total) * 100);
  const pctB = 100 - pctA;
  const leader = cheersA === cheersB ? null : (cheersA > cheersB ? teamA?.name : teamB?.name);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Fan Zone</CardTitle>
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <Megaphone className="h-3.5 w-3.5" />
          {cheersA + cheersB} cheers
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted">
            <span>{teamA?.name} · {pctA}%</span>
            <span>{teamB?.name} · {pctB}%</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-accent transition-all" style={{ width: `${pctA}%` }} />
            <div className="h-full bg-surface-3 transition-all" style={{ width: `${pctB}%` }} />
          </div>
          {leader && (
            <p className="text-xs text-muted">
              Crowd leader: <span className="text-foreground">{leader}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => cheer.mutate('teamA')} disabled={cheer.isPending}>
            Cheer {teamA?.name?.split(' ')[0]}
          </Button>
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => cheer.mutate('teamB')} disabled={cheer.isPending}>
            Cheer {teamB?.name?.split(' ')[0]}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
