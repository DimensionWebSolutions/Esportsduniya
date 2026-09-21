import { useState } from 'react';
import { HISTORICAL_EVENTS } from '@/data/mockData';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { Card, CardContent } from '@/ui/card';
import { Button } from '@/ui/button';
import { Clock, Play, Sparkles, Award, Flame, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

const ERAS = [
  { id: 'all', label: 'All Eras', icon: '⏳' },
  { id: 'vintage', label: '1920s–1950s', icon: '📻' },
  { id: 'retro', label: '1960s–1980s', icon: '📺' },
  { id: 'digital', label: '1990s–2010s', icon: '💾' },
  { id: 'modern', label: '2020s+', icon: '⚡' },
];

const SPORT_TAGS = {
  cricket: { color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10', icon: '🏏' },
  football: { color: 'border-blue-500/30 text-blue-400 bg-blue-500/10', icon: '⚽' },
  nba: { color: 'border-orange-500/30 text-orange-400 bg-orange-500/10', icon: '🏀' },
  tennis: { color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10', icon: '🎾' },
  f1: { color: 'border-red-500/30 text-red-400 bg-red-500/10', icon: '🏎️' },
  general: { color: 'border-accent/30 text-accent bg-accent/10', icon: '🏆' },
};

export default function TimeMachinePage() {
  const [era, setEra] = useState('all');
  const [selectedSport, setSelectedSport] = useState('all');
  const [playingMoment, setPlayingMoment] = useState(null);

  const events = HISTORICAL_EVENTS.filter(e => {
    const eraMatch = era === 'all' || e.era === era;
    const sportMatch = selectedSport === 'all' || e.sport === selectedSport;
    return eraMatch && sportMatch;
  });

  return (
    <DashboardLayout
      title="Sports Time Machine"
      description="Relive legendary moments that shook the sporting world — from timeless classics to modern epics."
    >
      {/* Era Navigation */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {ERAS.map(e => (
          <Button
            key={e.id}
            variant={era === e.id ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setEra(e.id)}
            className="flex items-center gap-1.5"
          >
            <span>{e.icon}</span>
            <span>{e.label}</span>
          </Button>
        ))}
      </div>

      {/* Cinematic Banner */}
      <div className="relative mb-8 overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/10 via-surface-1 to-surface-1 p-6">
        <div className="relative z-10 max-w-xl">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
            <Sparkles className="h-4 w-4" />
            <span>Interactive Sports Chronicle</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            Rewind The Greatest Sporting Masterpieces
          </h2>
          <p className="mt-2 text-sm text-muted">
            Explore turning points in world sport history, legendary upsets, and immortal dynasties recorded in high fidelity.
          </p>
        </div>
      </div>

      {/* Timeline view */}
      <div className="relative ml-4 space-y-8 border-l-2 border-border pl-6 sm:ml-8 sm:pl-8">
        {events.map((event, idx) => {
          const tag = SPORT_TAGS[event.sport] || SPORT_TAGS.general;
          const isSelected = playingMoment?.id === event.id;

          return (
            <div key={event.id || idx} className="relative group">
              {/* Timeline dot */}
              <span className={cn(
                'absolute -left-[31px] sm:-left-[39px] top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 border-accent bg-surface-0 transition-transform group-hover:scale-125 group-hover:shadow-[0_0_12px_rgba(0,194,255,0.6)]'
              )}>
                <span className="h-2 w-2 rounded-full bg-accent" />
              </span>

              <Card className={cn(
                'overflow-hidden transition-all duration-300 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/5',
                isSelected && 'border-accent bg-surface-2'
              )}>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium', tag.color)}>
                        {tag.icon} {event.sport?.toUpperCase()}
                      </span>
                      <span className="font-data text-xs text-muted">Year {event.year}</span>
                    </div>

                    <button
                      onClick={() => setPlayingMoment(isSelected ? null : event)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      {isSelected ? 'Close Replay' : 'Relive Moment'}
                    </button>
                  </div>

                  <h3 className="mt-3 font-display text-xl font-bold text-foreground group-hover:text-accent transition-colors">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{event.description}</p>

                  {/* Relive Simulation Drawer */}
                  {isSelected && (
                    <div className="mt-5 rounded-xl border border-accent/30 bg-surface-0/80 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between mb-3">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent">
                          <Flame className="h-4 w-4 text-orange-400" />
                          Atmosphere & Legacy Impact
                        </span>
                        <span className="font-data text-xs text-emerald-400">Archived Broadcast</span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        This watershed moment transformed the trajectory of {event.sport}. Fans across stadium gates experienced an unprecedented emotional surge, solidifying {event.title} in global folklore.
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-xs font-data text-muted">
                        <span>Intensity Rating: <strong className="text-foreground">99/100</strong></span>
                        <span>·</span>
                        <span>Audience reach: <strong className="text-foreground">1B+</strong></span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
