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

const RIVALRIES = [
  { id: 'mi-csk', label: 'MI vs CSK', blurb: 'The IPL’s most-watched rivalry — Mumbai Indians against Chennai Super Kings.' },
  { id: 'ind-pak', label: 'India vs Pakistan', blurb: 'The biggest fixture in cricket, and the hardest one to call with a clear head.' },
  { id: 'el-clasico', label: 'El Clásico', blurb: 'Barcelona against Real Madrid, where form books tend to go out of the window.' },
];

const SCORING_NOTES = [
  {
    title: 'Season points',
    body: 'Earned from predictions that resolve correctly during the current week. The season resets every Monday, so a cold streak never follows you forever.',
  },
  {
    title: 'Calibration',
    body: 'Starts at 50 and moves towards your true hit rate as you resolve more picks. Because it is confidence-weighted, five lucky calls will not vault you above someone with fifty solid ones.',
  },
  {
    title: 'Rivalry boards',
    body: 'Separate tables for the fixtures fans argue about most. Only resolved picks on those matches count, so reading a derby correctly is worth more than volume.',
  },
];

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

  const rivalryColumns = [
    { key: 'rank', header: '#', render: row => `#${row.rank}`, className: 'font-data w-12' },
    { key: 'username', header: 'Player', render: row => <span>{row.avatar} {row.username}</span> },
    { key: 'winRate', header: 'Hit rate', render: row => <span className="font-data font-semibold text-accent">{row.winRate}%</span> },
    { key: 'rivalryPicks', header: 'Picks', render: row => row.rivalryPicks, className: 'font-data' },
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

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">Rivalry boards</h2>
        <p className="mt-1 text-sm text-muted">Who actually reads the fixtures everyone has an opinion about.</p>
        <Tabs defaultValue={RIVALRIES[0].id} className="mt-4">
          <TabsList>
            {RIVALRIES.map(rivalry => (
              <TabsTrigger key={rivalry.id} value={rivalry.id}>{rivalry.label}</TabsTrigger>
            ))}
          </TabsList>
          {RIVALRIES.map(rivalry => (
            <TabsContent key={rivalry.id} value={rivalry.id} className="space-y-3">
              <p className="text-sm text-muted">{rivalry.blurb}</p>
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <DataTable
                  columns={rivalryColumns}
                  data={(season?.rivalries?.[rivalry.id] || []).map((row, i) => ({ ...row, id: row.username, rank: i + 1 }))}
                  emptyMessage={`No resolved ${rivalry.label} picks yet — call the next one and claim the top spot.`}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">How scoring works</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {SCORING_NOTES.map(note => (
            <div key={note.title} className="rounded-xl border border-border bg-surface-1 p-5">
              <h3 className="font-display font-semibold text-foreground">{note.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{note.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <Button variant="outline" asChild><Link to="/">Browse live matches</Link></Button>
      </div>
    </DashboardLayout>
  );
}
