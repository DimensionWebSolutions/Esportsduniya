import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { RefreshCw, Radio, ExternalLink, Sparkles, Swords, Trophy, Flame } from 'lucide-react';
import { SPORTS } from '@/data/mockData.js';
import { helmetForSport } from '@/data/sport-seo.js';
import {
  useLiveScores,
  useUpcomingMatches,
  usePublicStats,
  useTrending,
  useHeadlines,
} from '@/hooks/useLiveScores';
import { MatchCard, MatchCardSkeleton } from '@/ui/match-card';
import { Button } from '@/ui/button';
import { Section, StatTile } from '@/ui/section';
import { cn, safeReadStorageJson } from '@/lib/utils';
import SportHeroBanner from '@/components/SportHeroBanner.jsx';
import MatchCountdown from '@/components/MatchCountdown.jsx';
import {
  FOLLOWED_TEAMS_STORAGE_KEY,
  isTeamFollowed,
  normalizeFollowedTeams,
  toggleFollowedTeam,
} from '@/lib/followed-teams.js';

function scoreSourceLabel(source) {
  if (!source || source === 'unavailable') return null;
  const labels = {
    'football-data': 'Football Data',
    cricapi: 'CricAPI',
    thesportsdb: 'TheSportsDB',
    'ai-search-live': 'Live search',
    'ai-search-cached': 'Cached search',
  };
  return source.split('+').map(item => labels[item] || item).join(' · ');
}

function readPrefs() {
  const user = safeReadStorageJson('user', null);
  const onboarding = safeReadStorageJson('esd_onboarding', null);
  const favSports = user?.preferences?.favoriteSports?.length
    ? user.preferences.favoriteSports
    : onboarding?.sports?.length
      ? onboarding.sports
      : ['cricket', 'football'];
  return { favSports };
}

export default function HomePage() {
  const { sport: sportParam } = useParams();
  const navigate = useNavigate();
  const activeSport = sportParam || 'all';
  const { favSports } = readPrefs();
  const [followedTeams, setFollowedTeams] = useState(() => normalizeFollowedTeams(
    safeReadStorageJson(FOLLOWED_TEAMS_STORAGE_KEY, []),
  ));

  useEffect(() => {
    const syncFollowedTeams = event => {
      if (event.key && event.key !== FOLLOWED_TEAMS_STORAGE_KEY) return;
      setFollowedTeams(normalizeFollowedTeams(
        safeReadStorageJson(FOLLOWED_TEAMS_STORAGE_KEY, []),
      ));
    };
    window.addEventListener('storage', syncFollowedTeams);
    return () => window.removeEventListener('storage', syncFollowedTeams);
  }, []);

  const toggleTeamFollow = (name, sport) => {
    const updated = toggleFollowedTeam(followedTeams, name, sport);
    setFollowedTeams(updated);
    try {
      window.localStorage.setItem(FOLLOWED_TEAMS_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Could not save followed teams:', error);
    }
  };

  const { data, isLoading, error, refetch, isFetching } = useLiveScores(activeSport);
  const { data: socialStats } = usePublicStats();
  const { data: trending = [] } = useTrending();
  const { data: headlines = [] } = useHeadlines(6);

  const liveFeedMatches = data?.matches || [];
  const liveFeedUpcomingCount = liveFeedMatches.filter(
    match => match.status === 'upcoming' || match.status === 'scheduled',
  ).length;
  const shouldLoadUpcoming = Boolean(data) && liveFeedUpcomingCount < 3;
  const {
    data: scheduledMatches = [],
    isFetching: isFetchingSchedule,
  } = useUpcomingMatches(activeSport, shouldLoadUpcoming);
  const knownMatchIds = new Set(liveFeedMatches.map(match => `${match.sport}:${match.id}`));
  const matches = [...liveFeedMatches];
  for (const match of scheduledMatches) {
    const key = `${match.sport}:${match.id}`;
    if (knownMatchIds.has(key)) continue;
    matches.push(match);
    knownMatchIds.add(key);
  }
  const filtered = activeSport === 'all'
    ? matches
    : matches.filter(m => m.sport === activeSport);

  const prioritized = [...filtered].sort((a, b) => {
    const fav = (m) => favSports.includes(m.sport) ? 1 : 0;
    const live = (m) => m.status === 'live' ? 1 : 0;
    return live(b) - live(a) || fav(b) - fav(a);
  });

  const liveCount = matches.filter(m => m.status === 'live').length;
  const followedMatches = prioritized.filter(match => (
    ['live', 'upcoming', 'scheduled'].includes(match.status)
    && (
      isTeamFollowed(followedTeams, match.teamA?.name, match.sport)
      || isTeamFollowed(followedTeams, match.teamB?.name, match.sport)
    )
  ));
  const scoreSource = scoreSourceLabel(data?.meta?.source);
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

      {matches.length > 0 && (
        <SportHeroBanner matches={prioritized} />
      )}

      {/* Quick Action Interactive Hub */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          to="/fantasy"
          className="group relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-950/40 via-surface-1 to-surface-1 p-4 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
              <Swords className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-sm font-semibold text-foreground">Fantasy Draft</span>
                <span className="rounded-full bg-blue-500/20 px-1.5 py-0.2 text-[10px] font-bold text-blue-400 uppercase tracking-wider">New</span>
              </div>
              <p className="text-xs text-muted">Build Dream Squad · 100M Cap</p>
            </div>
          </div>
        </Link>

        <Link
          to="/quiz"
          className="group relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-950/40 via-surface-1 to-surface-1 p-4 transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-sm font-semibold text-foreground">Daily Sports Trivia</span>
                <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-400 uppercase tracking-wider">Streak</span>
              </div>
              <p className="text-xs text-muted">5 Questions · 20s Blitz</p>
            </div>
          </div>
        </Link>

        <Link
          to="/arena"
          className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 via-surface-1 to-surface-1 p-4 transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              <Flame className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-sm font-semibold text-foreground">Prediction Arena</span>
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
              </div>
              <p className="text-xs text-muted">Pick Outcomes · Climb Ranks</p>
            </div>
          </div>
        </Link>
      </div>

      <Section
        title="My Matchday"
        className="mb-8"
        description="Live and upcoming matches featuring the teams you follow."
      >
        {followedTeams.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted">
            Tap a star beside a team in any match to build your personal matchday feed.
          </p>
        ) : followedMatches.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-1 p-5">
            <p className="text-sm text-muted">No followed teams are playing in the matches available right now.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
            {followedMatches.slice(0, 3).map(match => (
              <MatchCard
                key={`${match.sport}:${match.id}`}
                match={match}
                href={`/match/${match.id}`}
                followedTeams={followedTeams}
                onFollowTeam={toggleTeamFollow}
              />
            ))}
          </div>
        )}
        {followedTeams.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Followed teams">
            {followedTeams.map(team => (
              <button
                key={`${team.sport}:${team.name}`}
                type="button"
                onClick={() => toggleTeamFollow(team.name, team.sport)}
                className="rounded-full border border-border bg-surface-1 px-3 py-1 text-xs text-muted hover:border-accent/40 hover:text-foreground"
                aria-label={`Unfollow ${team.name}`}
                title={`Stop following ${team.name}`}
              >
                ★ {team.name} ×
              </button>
            ))}
          </div>
        )}
      </Section>

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
          <span>
            · Updated {new Date(data.meta.fetchedAt).toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
            })} IST
          </span>
        )}
        {scoreSource && <span>· Source: {scoreSource}</span>}
        {data?.meta?.stale && (
          <span className="text-xs text-amber-300">· Showing cached scores; they may be out of date</span>
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

      {prioritized.filter(m => m.status === 'upcoming' || m.status === 'scheduled').length > 0 && (
        <Section title="Upcoming Showdowns" className="mb-8" description="Countdowns and kickoff reminders">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {prioritized
              .filter(m => m.status === 'upcoming' || m.status === 'scheduled')
              .slice(0, 3)
              .map(m => (
                  <MatchCountdown key={`${m.sport}:${m.id}`} match={m} />
              ))}
          </div>
        </Section>
      )}

      <Section
        title={activeSport === 'all' ? 'All matches' : `${SPORTS.find(s => s.id === activeSport)?.label || activeSport} matches`}
        description={`${prioritized.length} matches`}
      >
        {isLoading || (isFetchingSchedule && matches.length === 0) ? (
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
                key={`${match.sport}:${match.id}`}
                match={match}
                href={`/match/${match.id}`}
                onClick={(m) => navigate(`/match/${m.id}`)}
                followedTeams={followedTeams}
                onFollowTeam={toggleTeamFollow}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
