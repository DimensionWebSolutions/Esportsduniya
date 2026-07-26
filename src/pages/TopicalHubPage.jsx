import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarCheck, HelpCircle } from 'lucide-react';
import { TOPICAL_HUBS, SITE_URL, hubMatchFilter } from '../../lib/seo-config.js';
import { useLiveScores } from '@/hooks/useLiveScores';
import { MatchCard, MatchCardSkeleton } from '@/ui/match-card';
import { Button } from '@/ui/button';
import { Section, StatTile } from '@/ui/section';
import { Card, CardContent } from '@/ui/card';

const HUB_PATHS = {
  'ipl-2026': 'cricket/ipl-2026',
  'premier-league': 'football/premier-league',
};

function faqJsonLd(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export default function TopicalHubPage({ hubKey }) {
  const hubPath = HUB_PATHS[hubKey];
  const hub = TOPICAL_HUBS[hubPath];
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useLiveScores(hub?.sport || 'cricket');

  if (!hub) return null;

  const all = data?.matches || [];
  const hubMatches = all.filter(hubMatchFilter(hubPath));
  const matches = hubMatches.length ? hubMatches : all;
  const showingFallback = !hubMatches.length && all.length > 0;
  const liveCount = matches.filter(m => m.status === 'live').length;

  return (
    <div className="mx-auto max-w-7xl">
      <Helmet>
        <title>{hub.title}</title>
        <meta name="description" content={hub.description} />
        <meta property="og:locale" content="en_IN" />
        <link rel="canonical" href={`${SITE_URL}/${hubPath}`} />
        {hub.faqs?.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(faqJsonLd(hub.faqs))}</script>
        )}
      </Helmet>

      <header className="mb-8 border-b border-border pb-6">
        <h1 className="font-display text-3xl font-bold">{hub.h1}</h1>
        <p className="mt-2 max-w-2xl text-muted">{hub.intro}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><Link to={`/sport/${hub.sport}`}>All {hub.sport} scores</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/standings">Points table</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/quiz">Daily quiz</Link></Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>Refresh</Button>
        </div>
      </header>

      {hub.keyFacts?.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {hub.keyFacts.map(fact => (
            <StatTile key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>
      )}

      <Section
        title="Fixtures & results"
        description={
          isLoading
            ? 'Loading the latest card…'
            : liveCount
              ? `${liveCount} live now · ${matches.length} on the card`
              : `${matches.length} matches on the card`
        }
        className="mb-10"
      >
        {showingFallback && (
          <p className="text-sm text-muted">
            No {hub.sport === 'cricket' ? 'IPL' : 'Premier League'} fixtures on right now — here is the wider {hub.sport} card instead.
          </p>
        )}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <MatchCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <p className="text-muted">Could not load scores. Try again shortly.</p>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-8 text-muted">
            <CalendarCheck className="h-6 w-6" strokeWidth={1.5} />
            <p className="text-sm">
              Nothing scheduled at this moment. The card refreshes every minute, and the points table stays up to date between matchdays.
            </p>
            <Button size="sm" variant="outline" asChild><Link to="/standings">Open points table</Link></Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {matches.map(match => (
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

      {hub.faqs?.length > 0 && (
        <Section title="Questions fans ask" description="The rules and jargon behind the scoreboard">
          <div className="grid gap-4 lg:grid-cols-2">
            {hub.faqs.map(faq => (
              <Card key={faq.q}>
                <CardContent className="p-5">
                  <h3 className="flex items-start gap-2 font-display text-base font-semibold text-foreground">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                    {faq.q}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
