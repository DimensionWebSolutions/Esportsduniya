import { useLeaderboard } from '@/hooks/useLiveScores';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { StatTile } from '@/ui/section';
import { DataTable } from '@/ui/table';
import { Skeleton } from '@/ui/section';

export default function AnalyticsPage() {
  const { data, isLoading } = useLeaderboard('alltime');
  const board = data?.leaderboard || [];

  const columns = [
    { key: 'rank', header: '#', render: row => row.rank, className: 'font-data w-12' },
    { key: 'username', header: 'Fan', render: row => row.username },
    { key: 'fanPoints', header: 'Points', render: row => <span className="font-data text-accent">{(row.fanPoints || 0).toLocaleString()}</span> },
    { key: 'streak', header: 'Streak', render: row => row.streak || '—', className: 'font-data' },
  ];

  return (
    <DashboardLayout title="Analytics" description="Platform engagement and top fan activity.">
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatTile label="Ranked fans" value={data?.total ?? board.length} />
        <StatTile label="Top score" value={board[0]?.fanPoints?.toLocaleString() ?? '—'} />
        <StatTile label="Window" value="All time" />
      </div>
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <DataTable columns={columns} data={board} emptyMessage="No analytics data yet." />
      )}
    </DashboardLayout>
  );
}
