import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Target, Check, Flame } from 'lucide-react';
import { apiUrl } from '@/config/apiBase';
import { useAuth } from '@/hooks/useAuth';
import { reportChallengeProgress, CHALLENGE_PROGRESS_EVENT } from '@/features/engagement/challengeProgress';
import { Card, CardContent } from '@/ui/card';
import { Button } from '@/ui/button';
import { Skeleton } from '@/ui/section';
import { cn } from '@/lib/utils';

/** Where a fan can go to make progress on each challenge type. */
const CHALLENGE_LINKS = {
  view_match: { label: 'Browse matches', to: '/' },
  predict: { label: 'Open Arena', to: '/arena' },
  cheer: { label: 'Find a live match', to: '/' },
  share: { label: 'Find a match to share', to: '/' },
  login: { label: 'Play the daily quiz', to: '/quiz' },
};

export function DailyChallengesPanel({ className }) {
  const { user } = useAuth();
  const username = user?.username;

  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['challenges', username],
    queryFn: () => fetch(apiUrl(`/api/challenges/${encodeURIComponent(username)}`)).then(r => r.json()),
    enabled: Boolean(username),
    staleTime: 60_000,
  });

  const challenges = data?.challenges || [];

  // The check-in challenge is cleared simply by showing up for the day.
  useEffect(() => {
    if (!username) return;
    if (!challenges.some(c => c.type === 'login' && !c.completed)) return;
    reportChallengeProgress('login', 'login').then(() => {
      qc.invalidateQueries({ queryKey: ['challenges', username] });
    });
  }, [username, challenges, qc]);

  useEffect(() => {
    if (!username) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ['challenges', username] });
    document.addEventListener(CHALLENGE_PROGRESS_EVENT, refresh);
    return () => document.removeEventListener(CHALLENGE_PROGRESS_EVENT, refresh);
  }, [username, qc]);

  const completed = challenges.filter(c => c.completed).length;
  const totalReward = challenges.reduce((sum, c) => sum + (c.reward || 0), 0);

  return (
    <Card className={cn('h-full', className)}>
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Target className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display font-semibold text-foreground">Daily challenges</h3>
            <p className="text-xs text-muted">
              {username ? `${completed}/${challenges.length || 3} done · up to ${totalReward || 90} FanPoints` : 'Three tasks, fresh every day'}
            </p>
          </div>
          {user?.streak > 0 && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted">
              <Flame className="h-3.5 w-3.5 text-live" />{user.streak}d
            </span>
          )}
        </div>

        {!username ? (
          <>
            <p className="mt-4 text-sm text-muted">
              Watch matches, lock predictions and cheer in the Fan Zone to clear the day’s set. Finish all three for a bonus and keep your streak alive.
            </p>
            <div className="mt-auto pt-4">
              <Button size="sm" onClick={() => document.dispatchEvent(new CustomEvent('esd:open-login'))}>
                Sign in to play
              </Button>
            </div>
          </>
        ) : isLoading ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : challenges.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Today’s challenges could not be loaded. Try again in a moment.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {challenges.map(challenge => {
              const target = challenge.target || 1;
              const progress = Math.min(challenge.progress || 0, target);
              const link = CHALLENGE_LINKS[challenge.type];
              return (
                <li
                  key={challenge.id}
                  className={cn(
                    'rounded-lg border px-3 py-2.5',
                    challenge.completed ? 'border-win/30 bg-win/5' : 'border-border bg-surface-2'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{challenge.title}</p>
                    {challenge.completed ? (
                      <Check className="h-4 w-4 shrink-0 text-win" />
                    ) : (
                      <span className="shrink-0 font-data text-xs text-muted">{progress}/{target}</span>
                    )}
                    <span className="shrink-0 font-data text-xs text-accent">+{challenge.reward}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">{challenge.description}</p>
                  {!challenge.completed && (
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(progress / target) * 100}%` }} />
                      </div>
                      {link && (
                        <Link to={link.to} className="shrink-0 text-xs text-accent hover:underline">{link.label}</Link>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
