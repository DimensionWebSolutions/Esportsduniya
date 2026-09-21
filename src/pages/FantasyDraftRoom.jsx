import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Users, Star, RefreshCw, Trophy, Shield, Swords } from 'lucide-react';
import { Button } from '@/ui/button';
import { cn } from '@/lib/utils';

const SPORT_COLORS = { cricket: '#22c55e', football: '#3b82f6' };

const CRICKET_PLAYERS = [
  { id: 'v1', name: 'Virat Kohli', role: 'BAT', team: 'RCB', pts: 92, flag: '🇮🇳', cost: 14 },
  { id: 'r1', name: 'Rohit Sharma', role: 'BAT', team: 'MI', pts: 88, flag: '🇮🇳', cost: 13 },
  { id: 's1', name: 'Shubman Gill', role: 'BAT', team: 'GT', pts: 85, flag: '🇮🇳', cost: 11 },
  { id: 'ja1', name: 'Jasprit Bumrah', role: 'BOWL', team: 'MI', pts: 95, flag: '🇮🇳', cost: 15 },
  { id: 'r2', name: 'Ravindra Jadeja', role: 'ALL', team: 'CSK', pts: 89, flag: '🇮🇳', cost: 12 },
  { id: 'm1', name: 'MS Dhoni', role: 'WK', team: 'CSK', pts: 86, flag: '🇮🇳', cost: 13 },
  { id: 'k1', name: 'KL Rahul', role: 'WK', team: 'LSG', pts: 82, flag: '🇮🇳', cost: 11 },
  { id: 'h1', name: 'Hardik Pandya', role: 'ALL', team: 'MI', pts: 80, flag: '🇮🇳', cost: 10 },
  { id: 'yu1', name: 'Yuzvendra Chahal', role: 'BOWL', team: 'RR', pts: 83, flag: '🇮🇳', cost: 9 },
  { id: 'mo1', name: 'Mohammed Siraj', role: 'BOWL', team: 'RCB', pts: 78, flag: '🇮🇳', cost: 8 },
  { id: 'su1', name: 'Suryakumar Yadav', role: 'BAT', team: 'MI', pts: 91, flag: '🇮🇳', cost: 13 },
  { id: 'ax1', name: 'Axar Patel', role: 'ALL', team: 'DC', pts: 77, flag: '🇮🇳', cost: 8 },
  { id: 'tr1', name: 'Trent Boult', role: 'BOWL', team: 'RR', pts: 84, flag: '🇳🇿', cost: 10 },
  { id: 'ry1', name: 'Rishabh Pant', role: 'WK', team: 'DC', pts: 87, flag: '🇮🇳', cost: 12 },
  { id: 'sa1', name: 'Sanju Samson', role: 'WK', team: 'RR', pts: 81, flag: '🇮🇳', cost: 10 },
];

const FOOTBALL_PLAYERS = [
  { id: 'me1', name: 'Lionel Messi', role: 'FWD', team: 'Inter Miami', pts: 98, flag: '🇦🇷', cost: 15 },
  { id: 'er1', name: 'Erling Haaland', role: 'FWD', team: 'Man City', pts: 96, flag: '🇳🇴', cost: 15 },
  { id: 'vi1', name: 'Vinícius Jr', role: 'FWD', team: 'Real Madrid', pts: 93, flag: '🇧🇷', cost: 13 },
  { id: 'jb1', name: 'Jude Bellingham', role: 'MID', team: 'Real Madrid', pts: 91, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', cost: 13 },
  { id: 'kb1', name: 'Kevin De Bruyne', role: 'MID', team: 'Man City', pts: 89, flag: '🇧🇪', cost: 12 },
  { id: 'ma1', name: 'Marcus Rashford', role: 'FWD', team: 'Man Utd', pts: 82, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', cost: 10 },
  { id: 'va1', name: 'Virgil van Dijk', role: 'DEF', team: 'Liverpool', pts: 86, flag: '🇳🇱', cost: 11 },
  { id: 'tr2', name: 'Trent Alexander-Arnold', role: 'DEF', team: 'Real Madrid', pts: 85, flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', cost: 11 },
  { id: 'al1', name: 'Alisson', role: 'GK', team: 'Liverpool', pts: 84, flag: '🇧🇷', cost: 10 },
  { id: 'th1', name: 'Thierry Henry Jr', role: 'MID', team: 'PSG', pts: 79, flag: '🇫🇷', cost: 9 },
  { id: 'pe1', name: 'Pedro', role: 'FWD', team: 'Lazio', pts: 80, flag: '🇧🇷', cost: 9 },
];

const POSITIONS = {
  cricket: [
    { role: 'WK', label: 'Wicket-Keeper', max: 1, min: 1 },
    { role: 'BAT', label: 'Batters', max: 4, min: 3 },
    { role: 'ALL', label: 'All-Rounders', max: 3, min: 1 },
    { role: 'BOWL', label: 'Bowlers', max: 4, min: 3 },
  ],
  football: [
    { role: 'GK', label: 'Goalkeeper', max: 1, min: 1 },
    { role: 'DEF', label: 'Defenders', max: 5, min: 3 },
    { role: 'MID', label: 'Midfielders', max: 5, min: 3 },
    { role: 'FWD', label: 'Forwards', max: 3, min: 1 },
  ],
};

const ROLE_COLORS = {
  WK: '#00c2ff', BAT: '#22c55e', ALL: '#a855f7', BOWL: '#f97316',
  GK: '#f97316', DEF: '#3b82f6', MID: '#22c55e', FWD: '#ef4444',
};

const SQUAD_SIZE = 11;
const BUDGET = 100;

function PlayerRow({ player, selected, onToggle, disabled }) {
  const color = ROLE_COLORS[player.role] || '#00c2ff';
  return (
    <button
      onClick={() => onToggle(player)}
      disabled={disabled && !selected}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all',
        selected
          ? 'border-accent/40 bg-accent/10'
          : disabled
            ? 'border-border/30 bg-surface-1 opacity-40 cursor-not-allowed'
            : 'border-border bg-surface-1 hover:border-border hover:bg-surface-2'
      )}
    >
      <span className="text-lg">{player.flag}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{player.name}</p>
        <p className="text-xs text-muted">{player.team}</p>
      </div>
      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${color}20`, color }}>
        {player.role}
      </span>
      <div className="text-right shrink-0">
        <p className="font-mono text-xs font-bold text-accent">{player.pts} pts</p>
        <p className="font-mono text-[10px] text-muted">£{player.cost}m</p>
      </div>
      <div className={cn('h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0', selected ? 'border-accent bg-accent' : 'border-border')}>
        {selected && <span className="text-[10px] font-bold text-white">✓</span>}
      </div>
    </button>
  );
}

export default function FantasyDraftRoom() {
  const [sport, setSport] = useState('cricket');
  const [squad, setSquad] = useState([]);
  const [captain, setCaptain] = useState(null);
  const [saved, setSaved] = useState(false);

  const players = sport === 'cricket' ? CRICKET_PLAYERS : FOOTBALL_PLAYERS;
  const color = SPORT_COLORS[sport] || '#00c2ff';
  const totalCost = squad.reduce((a, p) => a + p.cost, 0);
  const totalPts = squad.reduce((a, p) => a + p.pts + (p.id === captain ? p.pts : 0), 0);
  const budgetLeft = BUDGET - totalCost;

  // Load saved squad
  useEffect(() => {
    const key = `esd_fantasy_${sport}`;
    const s = JSON.parse(localStorage.getItem(key) || '{}');
    if (s.squad) setSquad(s.squad);
    if (s.captain) setCaptain(s.captain);
  }, [sport]);

  const togglePlayer = (player) => {
    setSquad(prev => {
      const idx = prev.findIndex(p => p.id === player.id);
      if (idx >= 0) {
        if (captain === player.id) setCaptain(null);
        return prev.filter(p => p.id !== player.id);
      }
      if (prev.length >= SQUAD_SIZE) return prev;
      if (budgetLeft < player.cost) return prev;
      return [...prev, player];
    });
  };

  const saveSquad = () => {
    const key = `esd_fantasy_${sport}`;
    localStorage.setItem(key, JSON.stringify({ squad, captain, savedAt: Date.now() }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const positions = POSITIONS[sport];

  return (
    <div className="mx-auto max-w-7xl">
      <Helmet>
        <title>Fantasy Draft Room | Esportsduniya</title>
        <meta name="description" content="Build your ultimate fantasy cricket or football squad. Pick 11 players, set your captain, and compete for the top of the leaderboard." />
      </Helmet>

      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-accent" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted">Fantasy Draft Room</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">Build Your Dream Squad</h1>
        <p className="mt-2 text-muted">Pick {SQUAD_SIZE} players within £{BUDGET}m budget · Set your captain for 2× points</p>
      </div>

      {/* Sport toggle */}
      <div className="mb-6 flex gap-2">
        {['cricket', 'football'].map(s => (
          <Button key={s} variant={sport === s ? 'default' : 'secondary'} size="sm" onClick={() => { setSport(s); setSquad([]); setCaptain(null); }}>
            {s === 'cricket' ? '🏏' : '⚽'} {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Player Pool */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-muted" />
            <h2 className="font-display font-semibold text-foreground">Player Pool</h2>
          </div>

          {/* Group by position */}
          {positions.map(pos => {
            const group = players.filter(p => p.role === pos.role);
            const pc = ROLE_COLORS[pos.role] || '#00c2ff';
            return (
              <div key={pos.role} className="mb-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: pc }} />
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: pc }}>{pos.label}</span>
                  <span className="text-xs text-muted">({pos.min}–{pos.max})</span>
                </div>
                <div className="space-y-1.5">
                  {group.map(player => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      selected={squad.some(p => p.id === player.id)}
                      onToggle={togglePlayer}
                      disabled={squad.length >= SQUAD_SIZE || (budgetLeft < player.cost && !squad.some(p => p.id === player.id))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Squad Summary */}
        <div className="lg:sticky lg:top-20 space-y-4">
          {/* Budget meter */}
          <div className="rounded-2xl border border-border bg-surface-1 p-4">
            <h3 className="mb-3 font-display font-semibold text-foreground">Your Squad</h3>
            <div className="mb-2 flex justify-between text-xs text-muted">
              <span>Budget used</span>
              <span className={cn('font-mono font-bold', budgetLeft < 10 ? 'text-red-400' : 'text-accent')}>
                £{totalCost}m / £{BUDGET}m
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(totalCost / BUDGET) * 100}%`, background: budgetLeft < 10 ? '#ef4444' : color }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs">
              <span className="text-muted">{squad.length}/{SQUAD_SIZE} players</span>
              <span className="font-mono font-bold text-accent">{totalPts} proj. pts</span>
            </div>
          </div>

          {/* Selected players */}
          <div className="rounded-2xl border border-border bg-surface-1 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted" />
              <h3 className="font-display font-semibold text-foreground">Starting XI</h3>
            </div>
            {squad.length === 0 ? (
              <p className="text-sm text-muted">No players selected yet</p>
            ) : (
              <div className="space-y-1.5">
                {squad.map(p => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
                    <span className="text-sm">{p.flag}</span>
                    <span className="flex-1 text-xs font-medium text-foreground truncate">{p.name}</span>
                    {/* Captain badge */}
                    <button
                      onClick={() => setCaptain(prev => prev === p.id ? null : p.id)}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors',
                        captain === p.id ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-surface-3 text-muted hover:text-amber-400'
                      )}
                      title={captain === p.id ? 'Remove captain' : 'Set as captain (2× pts)'}
                    >
                      <Star className="h-2.5 w-2.5" />
                    </button>
                    <span className="font-mono text-[10px] font-bold text-accent">{p.pts}pts</span>
                    <button onClick={() => togglePlayer(p)} className="text-muted hover:text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {squad.length > 0 && (
            <Button
              className="w-full"
              onClick={saveSquad}
              style={{ background: color }}
              disabled={squad.length < SQUAD_SIZE}
            >
              {saved ? '✓ Squad Saved!' : squad.length < SQUAD_SIZE ? `Pick ${SQUAD_SIZE - squad.length} more` : (
                <><Swords className="mr-2 h-4 w-4" />Save My Squad</>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
