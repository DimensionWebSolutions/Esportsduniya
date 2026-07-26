import { useQuery } from '@tanstack/react-query';
import { Eye, Sparkles, Megaphone, Share2, LogIn, Flame, CheckCircle2 } from 'lucide-react';
import { apiUrl } from '@/config/apiBase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { cn } from '@/lib/utils';

const TYPE_ICON = {
  view_match: Eye,
  predict: Sparkles,
  cheer: Megaphone,
  share: Share2,
  login: LogIn,
};

function ChallengeRow({ challenge }) {
  const Icon = TYPE_ICON[challenge.type] || Sparkles;
  const progress = Math.min(challenge.progress || 0, challenge.target);
  const pct = Math.min(100, Math.round((progress / challenge.target) * 100));

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors',
        challenge.completed ? 'border-accent/30 bg-accent/5' : 'border-border-subtle bg-surface-2'
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base',
          challenge.completed ? 'bg-accent/15 text-accent' : 'bg-surface-3 text-muted'
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">{challenge.title}</p>
          <span className="shrink-0 font-data text-xs text-muted">{progress}/{challenge.target}</span>
        </div>
        <p className="truncate text-xs text-muted">{challenge.description}</p>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn('h-full rounded-full transition-all', challenge.completed ? 'bg-accent' : 'bg-accent/60')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="shrink-0">
        {challenge.completed ? (
          <CheckCircle2 className="h-5 w-5 text-accent" />
        ) : (
          <span className="whitespace-nowrap font-data text-xs font-semibold text-accent">+{challenge.reward}</span>
        )}
      </div>
    </div>
  );
}

export default function DailyChallengesCard({ className, streak = 0 }) {
  const { user, isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['daily-challenges', user?.username],
    queryFn: () => fetch(apiUrl(`/api/challenges/${encodeURIComponent(user.username)}`)).then(r => r.json()),
    enabled: isAuthenticated,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  });

  if (!isAuthenticated) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">🎯 Daily Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Sign in to unlock 3 fresh challenges every day and earn bonus FanPoints for watching, predicting, cheering, and sharing.</p>
          <Button className="mt-4" size="sm" onClick={() => document.dispatchEvent(new CustomEvent('esd:open-login'))}>
            Sign in to start
          </Button>
        </CardContent>
      </Card>
    );
  }

  const challenges = data?.challenges || [];
  const allDone = challenges.length > 0 && challenges.every(c => c.completed);

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">🎯 Daily Challenges</CardTitle>
        {streak > 0 && (
          <span className="flex items-center gap-1 rounded-full border border-live/30 bg-live/10 px-2.5 py-0.5 text-xs font-semibold text-live">
            <Flame className="h-3.5 w-3.5" />
            {streak} day streak
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-2" />
            ))}
          </div>
        ) : (
          challenges.map(c => <ChallengeRow key={c.id} challenge={c} />)
        )}
        {allDone && (
          <div className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5 text-center text-sm font-medium text-accent">
            🎉 All done for today! +25 bonus FanPoints earned.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
