import { useState } from 'react';
import { HISTORICAL_EVENTS } from '@/data/mockData';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { Card, CardContent } from '@/ui/card';
import { Button } from '@/ui/button';

const ERAS = [
  { id: 'all', label: 'All eras' },
  { id: 'vintage', label: '1920s–1950s' },
  { id: 'retro', label: '1960s–1980s' },
  { id: 'digital', label: '1990s–2010s' },
  { id: 'modern', label: '2020s+' },
];

export default function TimeMachinePage() {
  const [era, setEra] = useState('all');
  const events = era === 'all' ? HISTORICAL_EVENTS : HISTORICAL_EVENTS.filter(e => e.era === era);

  return (
    <DashboardLayout
      title="Sports History"
      description="Iconic moments that defined cricket, football, and global sport."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {ERAS.map(e => (
          <Button key={e.id} variant={era === e.id ? 'default' : 'secondary'} size="sm" onClick={() => setEra(e.id)}>
            {e.label}
          </Button>
        ))}
      </div>

      <div className="relative space-y-0 border-l border-border pl-6">
        {events.map(event => (
          <Card key={event.id} className="relative mb-6 ml-2">
            <span className="absolute -left-[29px] top-6 h-3 w-3 rounded-full border-2 border-accent bg-surface-0" />
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                <span className="font-data">{event.year}</span>
                <span>·</span>
                <span className="capitalize">{event.sport}</span>
              </div>
              <h3 className="mt-2 font-display text-lg font-semibold">{event.title}</h3>
              <p className="mt-2 text-sm text-muted">{event.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
