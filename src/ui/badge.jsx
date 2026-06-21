import { cn } from '@/lib/utils';

const variants = {
  default: 'border-border bg-surface-2 text-foreground',
  live: 'border-live/40 bg-live/10 text-live',
  upcoming: 'border-accent/30 bg-accent/10 text-accent',
  finished: 'border-border bg-surface-2 text-muted',
  sport: 'border-border bg-surface-2',
};

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function LiveBadge({ className, ...props }) {
  return (
    <Badge variant="live" className={cn('gap-1.5', className)} {...props}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
      </span>
      Live
    </Badge>
  );
}

export function SportPill({ sport, label, className }) {
  const colors = {
    cricket: 'bg-sport-cricket/15 text-sport-cricket border-sport-cricket/30',
    football: 'bg-sport-football/15 text-sport-football border-sport-football/30',
    nba: 'bg-sport-nba/15 text-sport-nba border-sport-nba/30',
    basketball: 'bg-sport-nba/15 text-sport-nba border-sport-nba/30',
    tennis: 'bg-sport-tennis/15 text-sport-tennis border-sport-tennis/30',
    f1: 'bg-sport-f1/15 text-sport-f1 border-sport-f1/30',
    baseball: 'bg-red-500/15 text-red-400 border-red-500/30',
    hockey: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    handball: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    volleyball: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    rugby: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    mma: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    nfl: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    afl: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  };
  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize', colors[sport] || 'bg-surface-2 text-muted', className)}>
      {label || sport}
    </span>
  );
}
