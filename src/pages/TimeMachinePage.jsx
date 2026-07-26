import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CalendarHeart } from 'lucide-react';
import {
  HISTORICAL_EVENTS,
  HISTORY_SPORTS,
  anniversariesFor,
  eventYear,
  isAnniversary,
} from '@/data/sports-history';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { Card, CardContent } from '@/ui/card';
import { Button } from '@/ui/button';
import { SportPill } from '@/ui/badge';
import { cn } from '@/lib/utils';

const ERAS = [
  { id: 'all', label: 'All eras' },
  { id: 'vintage', label: '1920s–1950s' },
  { id: 'retro', label: '1960s–1980s' },
  { id: 'digital', label: '1990s–2010s' },
  { id: 'modern', label: '2020s+' },
];

function EventCard({ event, highlight }) {
  const year = eventYear(event);
  return (
    <Card className={cn('relative mb-6 ml-2', highlight && 'border-accent/40 bg-accent/5')}>
      <span className={cn(
        'absolute -left-[29px] top-6 h-3 w-3 rounded-full border-2 bg-surface-0',
        highlight ? 'border-live' : 'border-accent'
      )} />
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="font-data text-foreground">{year ?? event.decade}</span>
          <span>·</span>
          <span>{event.date}</span>
          <SportPill sport={event.sport} className="ml-auto" />
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold">{event.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{event.description}</p>
        {event.stats?.length > 0 && (
          <dl className="mt-4 flex flex-wrap gap-2">
            {event.stats.map(stat => (
              <div key={stat.label} className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-1.5">
                <dt className="text-[10px] uppercase tracking-wider text-muted">{stat.label}</dt>
                <dd className="font-data text-sm text-foreground">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

export default function TimeMachinePage() {
  const [era, setEra] = useState('all');
  const [sport, setSport] = useState('all');

  const today = useMemo(() => new Date(), []);
  const anniversaries = useMemo(() => anniversariesFor(today), [today]);

  const events = HISTORICAL_EVENTS.filter(e => (
    (era === 'all' || e.era === era) && (sport === 'all' || e.sport === sport)
  ));

  const oldest = Math.min(...HISTORICAL_EVENTS.map(e => eventYear(e) ?? 9999));
  const todayLabel = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });

  return (
    <DashboardLayout
      title="Sports History"
      description={`${HISTORICAL_EVENTS.length} moments that defined cricket, football, athletics and global sport since ${oldest}.`}
    >
      <Helmet>
        <title>Sports History Timeline — Iconic Moments | Esportsduniya</title>
        <meta name="description" content="A timeline of the moments that shaped sport: 1983 at Lord's, Istanbul 2005, Bolt in Beijing, the Gabba 2021 and more, each with the numbers behind it." />
        <link rel="canonical" href="https://esportsduniya.in/timemachine" />
      </Helmet>

      {anniversaries.length > 0 && (
        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <CalendarHeart className="h-4 w-4 text-live" />
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">On this day — {todayLabel}</h2>
          </div>
          <div className="relative border-l border-border pl-6">
            {anniversaries.map(event => <EventCard key={`anniversary-${event.id}`} event={event} highlight />)}
          </div>
        </section>
      )}

      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap gap-2">
          {ERAS.map(e => (
            <Button key={e.id} variant={era === e.id ? 'default' : 'secondary'} size="sm" onClick={() => setEra(e.id)}>
              {e.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={sport === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setSport('all')}>
            All sports
          </Button>
          {HISTORY_SPORTS.map(s => (
            <Button key={s} variant={sport === s ? 'default' : 'ghost'} size="sm" className="capitalize" onClick={() => setSport(s)}>
              {s}
            </Button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-sm text-muted">
        {events.length} {events.length === 1 ? 'moment' : 'moments'}
      </p>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted">
          <p>Nothing in the archive for that combination yet.</p>
        </div>
      ) : (
        <div className="relative border-l border-border pl-6">
          {events.map(event => (
            <EventCard key={event.id} event={event} highlight={isAnniversary(event, today)} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
