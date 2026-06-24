import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { RefreshCw, Radio, ExternalLink } from 'lucide-react';
import { SPORTS } from '@/data/mockData.js';
import { helmetForSport } from '@/data/sport-seo.js';
import { useLiveScores, usePublicStats, useTrending, useHeadlines } from '@/hooks/useLiveScores';
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
  const { data: headlines = [] } = useHeadlines(6);

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
  const pageMeta = helmetForSport(activeSport);

  const setSport = (id) => {
    if (id === 'all') navigate('/');
    else navigate(`/sport/${id}`);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Helmet>
        <title>{pageMeta.title}</title>
        <meta name="description" content={pageMeta.description} />
        <meta property="og:locale" content="en_IN" />
        {activeSport !== 'all' && (
          <link rel="canonical" href={`https://esportsduniya.in/sport/${activeSport}`} />
        )}
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
        {data?.meta?.stale && (
          <span className="text-xs">· Cached scores</span>
        )}
      </div>

      {data?.meta?.error && (
        <div className="mb-6 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Some scores are temporarily unavailable. {data.meta.stale ? 'Showing cached scores.' : 'Try refreshing in a moment.'}
        </div>
      )}

      {headlines.length > 0 && (
        <Section title="Latest headlines" className="mb-8" description="Top sports news right now">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {headlines.map(h => (
              <a
                key={h.slug}
                href={h.sourceUrl || `/blog`}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-xl border border-border bg-surface-1 p-4 transition-colors hover:border-accent/40 hover:bg-surface-2"
              >
                <p className="text-xs uppercase tracking-wide text-muted">
                  {h.category}{h.sourceName ? ` · ${h.sourceName}` : ''}
                </p>
                <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground group-hover:text-accent">
                  {h.title}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
                  Read story <ExternalLink className="h-3 w-3" />
                </span>
              </a>
            ))}
          </div>
          <Link to="/blog" className="mt-4 inline-block text-sm text-accent hover:underline">View all news →</Link>
        </Section>
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
            <p className="mx-auto mt-3 max-w-md text-sm">Check back soon — schedules update throughout the day.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
            {prioritized.map(match => (
              <MatchCard
                key={match.id}
                match={match}
                href={`/match/${match.id}`}
                onClick={(m) => navigate(`/match/${m.id}`)}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
