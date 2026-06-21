import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '@/config/apiBase';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';

export function MatchFanZone({ matchId, teamA, teamB }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['fanzone', matchId],
    queryFn: () => fetch(apiUrl(`/api/fanzone/${encodeURIComponent(matchId)}`), { cache: 'no-store' }).then(r => r.json()),
    refetchInterval: 15_000,
  });

  const cheer = useMutation({
    mutationFn: (team) => fetch(apiUrl(`/api/fanzone/${encodeURIComponent(matchId)}/cheer`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team }),
    }).then(r => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fanzone', matchId] }),
  });

  const cheersA = data?.teamA ?? 0;
  const cheersB = data?.teamB ?? 0;
  const total = cheersA + cheersB || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fan Zone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted">
            <span>{teamA?.name}</span>
            <span className="font-data">{Math.round((cheersA / total) * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-accent" style={{ width: `${(cheersA / total) * 100}%` }} />
          </div>
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
