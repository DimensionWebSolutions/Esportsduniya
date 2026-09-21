import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

const ALL_BADGES = [
  { id: 'first_pred',    icon: '🔮', name: 'Oracle Initiate',   desc: 'Made your first prediction',         color: '#a855f7', condition: u => (u?.predictions?.length || 0) >= 1 },
  { id: 'streak_3',      icon: '🔥', name: 'On Fire',           desc: '3-day login streak',                 color: '#f97316', condition: u => (u?.streak || 0) >= 3 },
  { id: 'streak_7',      icon: '⚡', name: 'Week Warrior',       desc: '7-day login streak',                 color: '#eab308', condition: u => (u?.streak || 0) >= 7 },
  { id: 'streak_30',     icon: '💎', name: 'Diamond Devotee',    desc: '30-day login streak',                color: '#00c2ff', condition: u => (u?.streak || 0) >= 30 },
  { id: 'cricket_fan',   icon: '🏏', name: 'Cricket Fanatic',    desc: 'Predicted 5 cricket matches',        color: '#22c55e', condition: u => (u?.predictions || []).filter(p => p.sport === 'cricket').length >= 5 },
  { id: 'football_fan',  icon: '⚽', name: 'Football Faithful',  desc: 'Predicted 5 football matches',       color: '#3b82f6', condition: u => (u?.predictions || []).filter(p => p.sport === 'football').length >= 5 },
  { id: 'nba_fan',       icon: '🏀', name: 'Hoops Head',         desc: 'Predicted 5 NBA matches',            color: '#f97316', condition: u => (u?.predictions || []).filter(p => p.sport === 'nba').length >= 5 },
  { id: 'top10',         icon: '🏆', name: 'Top 10 Predictor',   desc: 'Ranked in top 10 of the arena',     color: '#ffd700', condition: u => (u?.arenaRank || 99) <= 10 },
  { id: 'correct_5',     icon: '🎯', name: 'Sharpshooter',       desc: '5 correct predictions',             color: '#34c759', condition: u => (u?.predictions || []).filter(p => p.status === 'correct').length >= 5 },
  { id: 'fan_1k',        icon: '🌟', name: 'Superfan',           desc: '1,000 FanPoints earned',            color: '#ff6b6b', condition: u => (u?.fanPoints || 0) >= 1000 },
  { id: 'fan_5k',        icon: '👑', name: 'Royalty',            desc: '5,000 FanPoints earned',            color: '#c084fc', condition: u => (u?.fanPoints || 0) >= 5000 },
  { id: 'pro',           icon: '⭐', name: 'Pro Member',         desc: 'Upgraded to Pro',                    color: '#00c2ff', condition: u => !!u?.isPremium },
];

function BadgeCard({ badge, earned }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !earned) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -20;
      el.style.transform = `perspective(400px) rotateX(${y}deg) rotateY(${x}deg) scale(1.04)`;
    };
    const onLeave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => { el.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, [earned]);

  return (
    <div
      ref={cardRef}
      className="relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200"
      style={{
        borderColor: earned ? `${badge.color}40` : 'rgba(255,255,255,0.06)',
        background: earned
          ? `linear-gradient(135deg, ${badge.color}15 0%, ${badge.color}05 100%)`
          : 'rgba(255,255,255,0.02)',
        filter: earned ? 'none' : 'grayscale(1)',
        opacity: earned ? 1 : 0.4,
        transformOrigin: 'center',
      }}
      title={badge.desc}
    >
      {/* Shimmer for earned badges */}
      {earned && (
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${badge.color}20 0%, transparent 50%, ${badge.color}10 100%)`,
          }}
        />
      )}

      {/* Lock indicator */}
      {!earned && (
        <div className="absolute top-2 right-2 text-[10px] text-white/20">🔒</div>
      )}

      <span className="text-3xl">{badge.icon}</span>
      <div>
        <p
          className="text-xs font-bold leading-tight"
          style={{ color: earned ? badge.color : 'rgba(255,255,255,0.3)' }}
        >
          {badge.name}
        </p>
        <p className="mt-0.5 text-[10px] text-white/30 leading-tight">{badge.desc}</p>
      </div>

      {earned && (
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
          style={{ background: `${badge.color}20`, color: badge.color }}
        >
          Earned
        </span>
      )}
    </div>
  );
}

export default function FanPassport({ user }) {
  const earnedBadges = ALL_BADGES.filter(b => b.condition(user));
  const lockedBadges = ALL_BADGES.filter(b => !b.condition(user));

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎴</span>
          <h3 className="font-display font-semibold text-foreground">Fan Passport</h3>
        </div>
        <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold text-accent border border-accent/20">
          {earnedBadges.length}/{ALL_BADGES.length} badges
        </span>
      </div>

      {earnedBadges.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted">Collected</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {earnedBadges.map(b => <BadgeCard key={b.id} badge={b} earned />)}
          </div>
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted">Locked</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {lockedBadges.map(b => <BadgeCard key={b.id} badge={b} earned={false} />)}
          </div>
        </div>
      )}
    </div>
  );
}
