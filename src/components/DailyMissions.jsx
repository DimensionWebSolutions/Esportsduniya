import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Flame } from 'lucide-react';
import {
  getTodayChallenges,
  getProgress,
  getCompletedToday,
  getChallengeStreak,
  isDone,
} from '@/components/DailyChallenges.js';
import { Section } from '@/ui/section';
import { Button } from '@/ui/button';
import { cn } from '@/lib/utils';

function challengeHint(id) {
  if (id.startsWith('oracle')) return { to: '/', label: 'Pick a live match' };
  if (id.startsWith('cheer')) return { to: '/', label: 'Open Fan Zone' };
  if (id.startsWith('share')) return { to: '/', label: 'Share a score' };
  return { to: '/arena', label: 'Enter Arena' };
}

export default function DailyMissions() {
  const [tick, setTick] = useState(0);
  const challenges = getTodayChallenges();
  const completed = getCompletedToday();
  const streak = getChallengeStreak();

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 4000);
    return () => clearInterval(id);
  }, []);

  // tick forces re-read of localStorage progress
  void tick;

  const doneCount = challenges.filter((c) => completed.includes(c.id) || isDone(c)).length;

  return (
    <Section
      title="Today's fan missions"
      description="Complete three quick actions to earn FanPoints and keep your streak alive."
      action={
        <div className="flex items-center gap-2 text-xs text-muted">
          <Flame className="h-3.5 w-3.5 text-live" />
          <span className="font-data">{streak}</span> day streak
        </div>
      }
      className="mb-8"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {challenges.map((c) => {
          const progress = getProgress(c.trackKey);
          const done = completed.includes(c.id) || progress >= c.target;
          const pct = Math.min(100, Math.round((progress / c.target) * 100));
          const hint = challengeHint(c.id);
          return (
            <div
              key={c.id}
              className={cn(
                'rounded-xl border border-border bg-surface-1 p-4 transition-colors',
                done && 'border-win/30 bg-win/5'
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.title}</p>
                  <p className="mt-1 text-xs text-muted">{c.desc}</p>
                </div>
                <span className="shrink-0 font-data text-xs text-accent">{done ? 'Done' : '+50'}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span className="font-data">{Math.min(progress, c.target)}/{c.target}</span>
                {!done && (
                  <Link to={hint.to} className="text-accent hover:underline">
                    {hint.label}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
        <Target className="h-4 w-4 text-accent" />
        <span>
          <span className="font-data text-foreground">{doneCount}</span>/{challenges.length} missions complete
        </span>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link to="/arena">Prediction Arena →</Link>
        </Button>
      </div>
    </Section>
  );
}
