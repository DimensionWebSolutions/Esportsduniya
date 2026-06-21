import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { RefreshCw, Radio } from 'lucide-react';
import { SPORTS } from '@/data/mockData.js';
import { useLiveScores, usePublicStats, useTrending } from '@/hooks/useLiveScores';
import { MatchCard, MatchCardSkeleton } from '@/ui/match-card';
import { Button } from '@/ui/button';
import { Section, StatTile } from '@/ui/section';
import { cn } from '@/lib/utils';

function readPrefs() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const onboarding = JSON.parse(localStorage.getItem('esd_onboarding') || 'null');
    const favSports = user?.preferences?.favoriteSports?.length
      ? user.preferences.favoriteSports
      : onboarding?.sports?.length
        ? onboarding.sports
        : ['cricket', 'football'];
    return { favSports };
  } catch {
    return { favSports: ['cricket', 'football'] };
  }
}

export default function HomePage() {
  const { sport: sportParam } = useParams();
  const navigate = useNavigate();
  const activeSport = sportParam || 'all';
  const { favSports } = readPrefs();

  const { data, isLoading, error, refetch, isFetching } = useLiveScores(activeSport);
  const { data: socialStats } = usePublicStats();
  const { data: trending = [] } = useTrending();

  const matches = data?.matches || [];
  const filtered = activeSport === 'all'
    ? matches
    : matches.filter(m => m.sport === activeSport);

  const prioritized = [...filtered].sort((a, b) => {
    const fav = (m) => favSports.includes(m.sport) ? 1 : 0;
    const live = (m) => m.status === 'live' ? 1 : 0;
    return live(b) - live(a) || fav(b) - fav(a);
  });

  const liveCount = matches.filter(m => m.status === 'live').length;

  const setSport = (id) => {
    if (id === 'all') navigate('/');
    else navigate(`/sport/${id}`);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Helmet>
        <title>Esportsduniya — Live Sports Intelligence</title>
        <meta name="description" content="Real-time scores, AI analysis, and prediction arena across Cricket, Football, NBA, Tennis, and F1." />
      </Helmet>

      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Radio className="h-4 w-4 text-live" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted">Live Sports Intelligence</span>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl text-balance">
          Real-time scores. AI insights. Professional sports data.
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">
          Track live matches across five sports with momentum analysis, predictions, and editorial-grade match coverage.
        </p>
      </div>

      {socialStats && (
        <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-3">
          <StatTile label="Fans" value={socialStats.users?.toLocaleString() ?? '—'} />
          <StatTile label="Predictions" value={socialStats.predictions?.toLocaleString() ?? '—'} />
          <StatTile label="Sports" value={socialStats.sports ?? 5} />
        </div>
      )}

      <div className="mb-6 -mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-max flex-wrap items-center gap-2 px-1">
        {SPORTS.map(s => (
          <Button
            key={s.id}
            variant={activeSport === s.id ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setSport(s.id)}
          >
            {s.label}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} className="ml-auto">
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
        <span>
          <span className="font-data text-foreground">{liveCount}</span> live now
        </span>
        {data?.meta?.fetchedAt && (
          <span>· Updated {new Date(data.meta.fetchedAt).toLocaleTimeString()}</span>
        )}
        {data?.meta?.source && (
          <span className="text-xs">· {data.meta.source}{data.meta.stale ? ' (cached)' : ''}</span>
        )}
      </div>

      {data?.meta?.error && !/gemini|429|quota/i.test(data.meta.error) && (
        <div className="mb-6 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Some score feeds are unavailable from API-Sports: {data.meta.error}
          {data.meta.stale && ' Showing cached scores.'}
        </div>
      )}

      {trending.length > 0 && (
        <Section title="Trending" className="mb-8">
          <div className="flex flex-wrap gap-2">
            {trending.slice(0, 6).map(t => (
              <span key={t.sport || t.label} className="rounded-full border border-border bg-surface-1 px-3 py-1 text-xs text-muted">
                {t.label || t.sport}
              </span>
            ))}
          </div>
        </Section>
      )}

      <Section
        title={activeSport === 'all' ? 'All matches' : `${SPORTS.find(s => s.id === activeSport)?.label || activeSport} matches`}
        description={`${prioritized.length} matches`}
      >
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
            {Array.from({ length: 6 }).map((_, i) => <MatchCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-live/30 bg-live/5 p-8 text-center">
            <p className="text-muted">{error.message || 'Could not load scores'}</p>
            <Button className="mt-4" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : prioritized.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted">
            <p>No {activeSport === 'all' ? '' : `${activeSport} `}matches right now.</p>
            {activeSport !== 'all' && activeSport !== 'cricket' && (
              <p className="mx-auto mt-3 max-w-md text-sm">
                Live {activeSport} scores use API-Sports. Ensure <code className="text-foreground">APISPORTS_KEY</code> is set on the server.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
            {prioritized.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                onClick={(m) => navigate(`/match/${m.id}`)}
              />
            ))}
          </div>
        )}
      </Section>

      <footer className="mt-16 border-t border-border pt-8 text-sm text-muted">
        <div className="flex flex-wrap gap-4">
          <Link to="/about" className="hover:text-foreground">About</Link>
          <Link to="/pricing" className="hover:text-foreground">Pro Plans</Link>
          <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms</Link>
          <Link to="/contact" className="hover:text-foreground">Contact</Link>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} Esportsduniya</p>
      </footer>
    </div>
  );
}
