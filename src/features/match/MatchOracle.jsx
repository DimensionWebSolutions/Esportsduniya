import { useState } from 'react';
import { apiUrl } from '@/config/apiBase';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Button } from '@/ui/button';
import { trackEvent, EVENTS } from '@/services/analytics';
import { reportChallengeProgress } from '@/features/engagement/challengeProgress';

export function MatchOracle({ match, sport }) {
  const { user, token } = useAuth();
  const [selected, setSelected] = useState(null);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        if (res.ok) reportChallengeProgress('predict', `predict:${match.id}`);
      } else {
        setError(data.error || 'Could not save prediction');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (locked) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="font-display font-semibold text-accent">Prediction locked</p>
          <p className="mt-1 text-sm text-muted">You picked {selected === 'teamA' ? match.teamA?.name : match.teamB?.name}</p>
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
      </CardContent>
    </Card>
  );
}
