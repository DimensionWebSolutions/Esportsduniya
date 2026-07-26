import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '@/config/apiBase';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/layouts/PageLayouts';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Badge } from '@/ui/badge';
import { StatTile, Skeleton } from '@/ui/section';
import { SportPill } from '@/ui/badge';
import { DailyChallengesPanel } from '@/features/engagement/DailyChallengesPanel';

export default function ProfilePage() {
  const { user: authUser, token } = useAuth();
  const [user, setUser] = useState(null);
  const [predData, setPredData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authUser?.username) { setLoading(false); return; }
    Promise.all([
      fetch(apiUrl(`/api/profile/${authUser.username}`)).then(r => r.json()),
      fetch(apiUrl(`/api/predictions/${authUser.username}`)).then(r => r.ok ? r.json() : null),
    ]).then(([profile, preds]) => {
      setUser({ ...authUser, ...profile });
      setPredData(preds);
    }).finally(() => setLoading(false));
  }, [authUser?.username]);

  if (!authUser?.username) {
    return (
      <DashboardLayout title="Account">
        <Card><CardContent className="py-12 text-center">
          <p className="text-muted">Please sign in to view your profile.</p>
          <Button className="mt-4" onClick={() => document.dispatchEvent(new CustomEvent('esd:open-login'))}>Sign in</Button>
        </CardContent></Card>
      </DashboardLayout>
    );
  }

  if (loading) return <DashboardLayout title="Account"><Skeleton className="h-64 w-full" /></DashboardLayout>;

  const preds = predData?.predictions || [];

  return (
    <DashboardLayout title="Account" description={`@${user?.username}`}>
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatTile label="FanPoints" value={(user?.fanPoints || 0).toLocaleString()} />
        <StatTile label="Streak" value={`${user?.streak || 0} days`} />
        <StatTile label="Badges" value={user?.badges?.length || 0} />
      </div>

      <div className="mb-8">
        <DailyChallengesPanel />
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{user?.avatar || '👤'}</span>
            <div>
              <p className="font-display text-xl font-semibold">{user?.username}</p>
              {user?.isPremium && <Badge variant="upcoming">Pro member</Badge>}
            </div>
          </div>
          {!user?.isPremium && (
            <Button asChild variant="outline"><Link to="/pricing">Upgrade to Pro</Link></Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Prediction history</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {preds.length === 0 ? (
            <p className="text-sm text-muted">No predictions yet. <Link to="/" className="text-accent">Browse matches</Link></p>
          ) : preds.slice(0, 20).map(pred => (
            <div key={pred.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{pred.matchLabel}</p>
                <p className="text-xs text-muted">Picked {pred.teamPickedName} · {pred.wager} pts</p>
              </div>
              <div className="flex items-center gap-2">
                <SportPill sport={pred.sport} />
                <Badge variant={pred.status === 'correct' ? 'live' : pred.status === 'incorrect' ? 'finished' : 'upcoming'}>
                  {pred.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {message && <p className="mt-4 text-sm text-accent">{message}</p>}
    </DashboardLayout>
  );
}
