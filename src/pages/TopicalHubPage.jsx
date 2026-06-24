import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/ui/button';

const HUBS = {
  'ipl-2026': {
    sport: 'cricket',
    title: 'IPL 2026 Live Score & Schedule | Esportsduniya',
    description: 'IPL 2026 live scores, points table, match schedule, and AI predictions for Indian Premier League.',
    h1: 'IPL 2026 — Live Scores & Schedule',
    filter: (m) => /ipl|premier league/i.test(m.league || m.name || ''),
  },
  'premier-league': {
    sport: 'football',
    title: 'Premier League Live Score & Standings 2026 | Esportsduniya',
    description: 'EPL live scores, standings, fixtures, and AI match previews for Premier League 2025/26.',
    h1: 'Premier League — Live Scores & Standings',
    filter: (m) => /premier league|epl/i.test(m.league || ''),
  },
};

export default function TopicalHubPage({ hubKey }) {
  const hub = HUBS[hubKey];
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useLiveScores(hub?.sport || 'cricket');
  if (!hub) return null;

  const all = data?.matches || [];
  const filtered = all.filter(hub.filter);
  const matches = filtered.length ? filtered : all;

  return (
    <div className="mx-auto max-w-7xl">
      <Helmet>
        <title>{hub.title}</title>
        <meta name="description" content={hub.description} />
        <meta property="og:locale" content="en_IN" />
        <link rel="canonical" href={`https://esportsduniya.in/${hub.sport === 'cricket' ? 'cricket/ipl-2026' : 'football/premier-league'}`} />
      </Helmet>

      <header className="mb-8 border-b border-border pb-6">
        <h1 className="font-display text-3xl font-bold">{hub.h1}</h1>
        <p className="mt-2 max-w-2xl text-muted">{hub.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><Link to={`/sport/${hub.sport}`}>All {hub.sport} scores</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/standings">Standings</Link></Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Refresh</Button>
        </div>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <MatchCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <p className="text-muted">Could not load scores. Try again shortly.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {matches.map(match => (
            <MatchCard key={match.id} match={match} onClick={(m) => navigate(`/match/${m.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
