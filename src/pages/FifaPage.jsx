import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { HelpCircle } from 'lucide-react';
import { useLiveScores } from '@/hooks/useLiveScores';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { Card, CardContent } from '@/ui/card';
import { Button } from '@/ui/button';
import { Section, StatTile } from '@/ui/section';
import { MatchCard, MatchCardSkeleton } from '@/ui/match-card';

const TOURNAMENT_FACTS = [
  { label: 'Teams', value: '48' },
  { label: 'Matches', value: '104' },
  { label: 'Host nations', value: '3' },
  { label: 'Groups', value: '12 of 4' },
];

const FORMAT_NOTES = [
  {
    q: 'How does the 48-team World Cup work?',
    a: 'The 2026 tournament splits 48 teams into 12 groups of four. The top two from each group advance, along with the eight best third-placed teams, creating a 32-team knockout round that did not exist in previous editions.',
  },
  {
    q: 'Who is hosting, and where is the final?',
    a: 'Canada, Mexico and the United States share hosting duties across 16 venues. The final is scheduled for MetLife Stadium in New Jersey on 19 July 2026.',
  },
  {
    q: 'How do teams qualify?',
    a: 'Each confederation runs its own qualifying campaign with an expanded allocation — AFC gets eight direct slots, CAF nine, UEFA sixteen — plus an inter-confederation play-off for the last two places.',
  },
  {
    q: 'How are group ties broken?',
    a: 'Points first, then goal difference and goals scored across the group. If teams are still level, FIFA compares head-to-head results, then fair-play points, then a drawing of lots.',
  },
];

export default function FifaPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useLiveScores('football');

  const matches = (data?.matches || []).slice(0, 6);
  const liveCount = (data?.matches || []).filter(m => m.status === 'live').length;

  return (
    <DashboardLayout
      title="World Cup Hub"
      description="How the 48-team World Cup works, plus today's football card and where to make your calls."
    >
      <Helmet>
        <title>FIFA World Cup 2026 — Format, Fixtures & Live Football | Esportsduniya</title>
        <meta name="description" content="The 48-team World Cup format explained: 12 groups of four, a 32-team knockout round, three host nations and how qualification works — alongside live football scores." />
        <meta property="og:locale" content="en_IN" />
        <link rel="canonical" href="https://esportsduniya.in/fifa" />
      </Helmet>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TOURNAMENT_FACTS.map(fact => (
          <StatTile key={fact.label} label={fact.label} value={fact.value} />
        ))}
      </div>

      <Section
        title="Football on today"
        description={liveCount ? `${liveCount} live now` : 'Club and international fixtures from the live feed'}
        className="mb-10"
        action={<Button variant="outline" size="sm" asChild><Link to="/sport/football">All football</Link></Button>}
      >
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <MatchCardSkeleton key={i} />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-sm text-muted">
            No football fixtures on the card right now. The standings and format notes below stay useful between matchdays.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {matches.map(match => (
              <MatchCard key={match.id} match={match} href={`/match/${match.id}`} onClick={(m) => navigate(`/match/${m.id}`)} />
            ))}
          </div>
        )}
      </Section>

      <Section title="The format, explained" description="What changes when a World Cup grows to 48 teams" className="mb-10">
        <div className="grid gap-4 lg:grid-cols-2">
          {FORMAT_NOTES.map(note => (
            <Card key={note.q}>
              <CardContent className="p-5">
                <h3 className="flex items-start gap-2 font-display text-base font-semibold text-foreground">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                  {note.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{note.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/arena">Predict football matches</Link></Button>
        <Button variant="outline" asChild><Link to="/standings">League standings</Link></Button>
        <Button variant="outline" asChild><Link to="/quiz">World Cup trivia</Link></Button>
      </div>
    </DashboardLayout>
  );
}
