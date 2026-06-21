import { useState } from 'react';
import { useLeaderboard } from '@/hooks/useLiveScores';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { DataTable } from '@/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { Skeleton } from '@/ui/section';

export default function LeaderboardPage() {
  const [window, setWindow] = useState('alltime');
  const { user } = useAuth();
  const { data, isLoading } = useLeaderboard(window);
  const board = data?.leaderboard || [];

  const columns = [
    { key: 'rank', header: 'Rank', render: row => (
      <span className="font-data font-semibold">{row.rank <= 3 ? ['🥇','🥈','🥉'][row.rank - 1] : `#${row.rank}`}</span>
    ), className: 'w-16' },
    { key: 'username', header: 'Fan', render: row => (
      <div className="flex items-center gap-2">
        <span>{row.avatar || '👤'}</span>
        <span className="font-medium">{row.username}{row.username === user?.username ? ' (you)' : ''}</span>
      </div>
    ) },
    { key: 'fanPoints', header: 'Points', render: row => <span className="font-data font-semibold text-accent">{(row.fanPoints || 0).toLocaleString()}</span> },
    { key: 'streak', header: 'Streak', render: row => row.streak > 0 ? `🔥 ${row.streak}` : '–', className: 'font-data' },
  ];

  return (
    <DashboardLayout
      title="Fan Rankings"
      description="Top fans ranked by FanPoints from predictions, cheers, and engagement."
    >
      <Tabs value={window} onValueChange={setWindow}>
        <TabsList className="mb-6">
          <TabsTrigger value="alltime">All time</TabsTrigger>
          <TabsTrigger value="week">This week</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
        </TabsList>
        <TabsContent value={window}>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <DataTable columns={columns} data={board} emptyMessage="No fans ranked yet. Be the first!" />
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
