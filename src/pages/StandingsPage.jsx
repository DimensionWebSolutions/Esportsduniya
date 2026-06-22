import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStandings } from '@/services/apiService';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { DataTable } from '@/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { Skeleton } from '@/ui/section';

import LEAGUES from '@/data/standings-leagues.js';

export default function StandingsPage() {
  const [league, setLeague] = useState('football');
  const { data, isLoading, error } = useQuery({
    queryKey: ['standings', league],
    queryFn: () => fetchStandings(league),
    staleTime: 300_000,
  });

  const rows = (data || []).map((row, i) => ({ ...row, id: row.team || i, rank: i + 1 }));
  const isF1 = league === 'f1';

  const columns = [
    { key: 'rank', header: '#', render: row => row.rank, className: 'w-12 font-data' },
    { key: 'team', header: isF1 ? 'Driver' : 'Team', render: row => <span className="font-medium">{row.team}</span> },
    { key: 'wins', header: 'W', render: row => row.wins ?? '–', className: 'font-data text-center' },
    { key: 'losses', header: 'L', render: row => isF1 ? '–' : (row.losses ?? '–'), className: 'font-data text-center' },
    { key: 'draws', header: 'D', render: row => isF1 ? '–' : (row.draws ?? '–'), className: 'font-data text-center' },
    { key: 'points', header: 'Pts', render: row => <span className="font-data font-semibold">{row.points ?? '–'}</span>, className: 'text-center' },
  ];

  return (
    <DashboardLayout
      title="Standings"
      description="League tables for football (EPL), F1 drivers, and NBA."
    >
      <Tabs value={league} onValueChange={setLeague}>
        <TabsList className="mb-6 flex-wrap">
          {LEAGUES.map(l => (
            <TabsTrigger key={l.id} value={l.id}>{l.label}</TabsTrigger>
          ))}
        </TabsList>
        {LEAGUES.map(l => (
          <TabsContent key={l.id} value={l.id}>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
            ) : error ? (
              <p className="text-muted">Standings unavailable. Try again later.</p>
            ) : (
              <DataTable columns={columns} data={rows} emptyMessage="No standings data available for this league." />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}
