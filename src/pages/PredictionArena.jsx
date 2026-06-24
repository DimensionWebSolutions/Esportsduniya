import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { apiUrl } from '@/config/apiBase';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { DataTable } from '@/ui/table';
import { StatTile } from '@/ui/section';
import { Button } from '@/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { Skeleton } from '@/ui/section';

export default function PredictionArena() {
  const { user } = useAuth();
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl('/api/arena/season'))
      .then(r => r.json())
      .then(data => { setSeason(data); setError(''); })
      .catch(() => setError('Could not load arena standings'))
      .finally(() => setLoading(false));
  }, []);

  const standings = season?.standings || [];
  const myStats = standings.find(s => s.username === user?.username);
  const myRank = user?.username ? standings.findIndex(s => s.username === user.username) + 1 : 0;

  const columns = [
    { key: 'rank', header: 'Rank', render: row => `#${row.rank ?? standings.indexOf(row) + 1}`, className: 'font-data w-16' },
    { key: 'username', header: 'Player', render: row => row.username },
    { key: 'calibrationScore', header: 'Calibration', render: row => <span className="font-data">{row.calibrationScore ?? '—'}</span> },
    { key: 'seasonPoints', header: 'Points', render: row => <span className="font-data font-semibold text-accent">{row.seasonPoints ?? 0}</span> },
    { key: 'resolved', header: 'Resolved', render: row => row.resolved ?? '—', className: 'font-data' },
  ];

  return (
    <DashboardLayout
      title="Prediction Arena"
      description="Skill-rated predictions with weekly seasons and calibration scoring."
    >
      <Helmet>
        <title>Sports Prediction Arena India | Esportsduniya</title>
        <meta name="description" content="Compete in skill-rated sports predictions with weekly seasons, calibration scoring, and leaderboards. Free to play — sign in and predict live matches." />
        <meta property="og:title" content="Prediction Arena — Esportsduniya" />
        <meta property="og:description" content="Gamified sports predictions with calibration scoring and weekly leaderboards." />
        <meta property="og:url" content="https://esportsduniya.in/arena" />
        <meta property="og:locale" content="en_IN" />
        <link rel="canonical" href="https://esportsduniya.in/arena" />
      </Helmet>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Your calibration" value={myStats?.calibrationScore ?? '—'} />
        <StatTile label="Your rank" value={myRank || '—'} />
        <StatTile label="Season points" value={myStats?.seasonPoints ?? 0} />
        <StatTile label="Season" value={season?.weekId ?? '—'} sub={user?.streak ? `${user.streak} day streak` : undefined} />
      </div>

      {!user?.username && (
        <div className="mb-6 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
          <strong className="text-foreground">Sign in to compete</strong>
          <p className="mt-1 text-muted">Lock predictions on match pages to earn arena points.</p>
          <Button className="mt-3" size="sm" onClick={() => document.dispatchEvent(new CustomEvent('esd:open-login'))}>
            Sign in
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : error ? (
        <p className="text-muted">{error}</p>
      ) : (
        <DataTable columns={columns} data={standings.map((s, i) => ({ ...s, id: s.username, rank: i + 1 }))} emptyMessage="No arena standings yet." />
      )}

      <div className="mt-8">
        <Button variant="outline" asChild><Link to="/">Browse live matches</Link></Button>
      </div>
    </DashboardLayout>
  );
}
