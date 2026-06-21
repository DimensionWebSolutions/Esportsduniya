import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStandings } from '@/services/apiService';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { DataTable } from '@/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { Skeleton } from '@/ui/section';

const LEAGUES = [
  { id: 'football', label: 'Football' },
  { id: 'cricket', label: 'Cricket' },
  { id: 'nba', label: 'NBA' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'f1', label: 'F1' },
];

export default function StandingsPage() {
  const [league, setLeague] = useState('football');
  const { data, isLoading, error } = useQuery({
    queryKey: ['standings', league],
    queryFn: () => fetchStandings(league),
    staleTime: 300_000,
  });

  const rows = (data || []).map((row, i) => ({ ...row, id: row.team || i, rank: i + 1 }));

  const columns = [
    { key: 'rank', header: '#', render: row => row.rank, className: 'w-12 font-data' },
    { key: 'team', header: 'Team', render: row => <span className="font-medium">{row.team}</span> },
    { key: 'wins', header: 'W', render: row => row.wins ?? '–', className: 'font-data text-center' },
    { key: 'losses', header: 'L', render: row => row.losses ?? '–', className: 'font-data text-center' },
    { key: 'draws', header: 'D', render: row => row.draws ?? '–', className: 'font-data text-center' },
    { key: 'points', header: 'Pts', render: row => <span className="font-data font-semibold">{row.points ?? '–'}</span>, className: 'text-center' },
  ];

  return (
    <DashboardLayout
      title="Standings"
      description="League tables and championship rankings across all sports."
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
              <DataTable columns={columns} data={rows} emptyMessage="No standings data available." />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}
