import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '@/config/apiBase';
import { useAuth } from '@/hooks/useAuth';
import { useOraclePool } from '@/hooks/useLiveScores';
import { trackOracleAction } from '@/components/DailyChallenges.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { trackEvent, EVENTS } from '@/services/analytics';

export function MatchOracle({ match, sport }) {
  const { user, token } = useAuth();
  const { data: pool, refetch: refetchPool } = useOraclePool(match?.id);
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalsA = pool?.totals?.teamA ?? 0;
  const totalsB = pool?.totals?.teamB ?? 0;
  const poolTotal = totalsA + totalsB;
  const pctA = poolTotal ? Math.round((totalsA / poolTotal) * 100) : 50;
  const pctB = poolTotal ? 100 - pctA : 50;

  const lock = async () => {
    if (!selected) { setError('Select a team first.'); return; }
    if (!user?.username || !token) {
      document.dispatchEvent(new CustomEvent('esd:open-login'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/predictions/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: user.username,
          matchId: match.id,
          matchLabel: `${match.teamA?.name} vs ${match.teamB?.name}`,
          sport: sport || match.sport,
          teamPicked: selected,
          teamPickedName: selected === 'teamA' ? match.teamA?.name : match.teamB?.name,
        }),
      });
      const data = await res.json();
      if (res.ok || data.error === 'Prediction already made for this match') {
        setLocked(true);
        trackEvent(EVENTS.LOCK_PREDICTION, { match_id: match.id });
        trackOracleAction();
        // Contribute to community pool (best-effort)
        fetch(apiUrl(`/api/oracle/${encodeURIComponent(match.id)}/prediction`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team: selected, wager: 50 }),
        }).finally(() => refetchPool());
      } else {
        setError(data.error || 'Could not save prediction');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const CommunitySplit = () => (
    <div className="rounded-lg border border-border-subtle bg-surface-2 px-3 py-2">
      <p className="mb-2 text-xs uppercase tracking-wide text-muted">Community Oracle</p>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{match.teamA?.name} {pctA}%</span>
        <span>{match.teamB?.name} {pctB}%</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full">
        <div className="bg-accent" style={{ width: `${pctA}%` }} />
        <div className="bg-surface-3" style={{ width: `${pctB}%` }} />
      </div>
      <p className="mt-2 font-data text-xs text-muted">
        {poolTotal} prediction{poolTotal === 1 ? '' : 's'} locked
      </p>
    </div>
  );

  if (locked) {
    return (
      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="text-center">
            <p className="font-display font-semibold text-accent">Prediction locked</p>
            <p className="mt-1 text-sm text-muted">
              You picked {selected === 'teamA' ? match.teamA?.name : match.teamB?.name}
            </p>
          </div>
          <CommunitySplit />
          <Button asChild variant="secondary" className="w-full" size="sm">
            <Link to="/arena">See Arena standings →</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lock prediction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CommunitySplit />
        <div className="grid grid-cols-2 gap-2">
          {['teamA', 'teamB'].map(key => (
            <Button
              key={key}
              variant={selected === key ? 'default' : 'outline'}
              className="h-auto py-3 text-left"
              onClick={() => setSelected(key)}
            >
              {key === 'teamA' ? match.teamA?.name : match.teamB?.name}
            </Button>
          ))}
        </div>
        {error && <p className="text-sm text-live">{error}</p>}
        <Button className="w-full" onClick={lock} disabled={loading}>
          {loading ? 'Locking...' : 'Lock prediction · 50 pts'}
        </Button>
        <p className="text-center text-xs text-muted">
          Earn calibration score in the <Link to="/arena" className="text-accent hover:underline">Prediction Arena</Link>
        </p>
      </CardContent>
    </Card>
  );
}
