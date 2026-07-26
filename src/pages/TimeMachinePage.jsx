import { useMemo, useState } from 'react';
import { HISTORICAL_EVENTS } from '@/data/mockData';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { Card, CardContent } from '@/ui/card';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { EmptyState } from '@/ui/section';

const ERAS = [
  { id: 'all', label: 'All eras' },
  { id: 'onthisday', label: '🎉 On this day' },
  { id: 'vintage', label: '1920s–1950s' },
  { id: 'retro', label: '1960s–1980s' },
  { id: 'digital', label: '1990s–2010s' },
  { id: 'modern', label: '2020s+' },
];

/** Real "on this day" check — compares each event's real calendar date to today, not a hardcoded flag. */
function isOnThisDay(dateStr, today) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export default function TimeMachinePage() {
  const [era, setEra] = useState('all');

  const today = useMemo(() => new Date(), []);
  const enriched = useMemo(
    () => HISTORICAL_EVENTS.map(e => ({ ...e, onThisDay: isOnThisDay(e.date, today) })),
    [today]
  );
  const onThisDayCount = enriched.filter(e => e.onThisDay).length;

  const events = era === 'all'
    ? enriched
    : era === 'onthisday'
      ? enriched.filter(e => e.onThisDay)
      : enriched.filter(e => e.era === era);

  return (
    <DashboardLayout
      title="Sports History"
      description={`Iconic moments that defined cricket, football, and global sport. ${today.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}: ${onThisDayCount} moment${onThisDayCount === 1 ? '' : 's'} happened on this day.`}
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {ERAS.map(e => (
          <Button key={e.id} variant={era === e.id ? 'default' : 'secondary'} size="sm" onClick={() => setEra(e.id)}>
            {e.label}
            {e.id === 'onthisday' && onThisDayCount > 0 && (
              <span className="ml-1.5 rounded-full bg-surface-0/20 px-1.5 text-[10px]">{onThisDayCount}</span>
            )}
          </Button>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No moments on this day"
          description="Nothing in our archive lines up with today's date — check back tomorrow, or browse a different era."
        />
      ) : (
        <div className="relative space-y-0 border-l border-border pl-6">
          {events.map(event => (
            <Card key={event.id} className="relative mb-6 ml-2">
              <span className={`absolute -left-[29px] top-6 h-3 w-3 rounded-full border-2 bg-surface-0 ${event.onThisDay ? 'border-live' : 'border-accent'}`} />
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="font-data">{event.date || event.year}</span>
                  <span>·</span>
                  <span className="capitalize">{event.sport}</span>
                  {event.onThisDay && <Badge variant="live">On this day</Badge>}
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold">{event.title}</h3>
                <p className="mt-2 text-sm text-muted">{event.description}</p>
                {Array.isArray(event.stats) && event.stats.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-4">
                    {event.stats.map((s, i) => (
                      <div key={i}>
                        <p className="text-[10px] uppercase tracking-wide text-muted">{s.label}</p>
                        <p className="font-data text-sm font-semibold text-foreground">{s.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
