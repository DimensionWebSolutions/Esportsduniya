import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const SPORT_GRADIENTS = {
  cricket:  'from-emerald-900/80 via-emerald-800/40 to-transparent',
  football: 'from-blue-900/80 via-blue-800/40 to-transparent',
  nba:      'from-orange-900/80 via-orange-800/40 to-transparent',
  tennis:   'from-yellow-900/80 via-yellow-800/40 to-transparent',
  f1:       'from-red-900/80 via-red-800/40 to-transparent',
  default:  'from-slate-900/80 via-slate-800/40 to-transparent',
};

const SPORT_ACCENT = {
  cricket:  '#22c55e',
  football: '#3b82f6',
  nba:      '#f97316',
  tennis:   '#eab308',
  f1:       '#ef4444',
  default:  '#00c2ff',
};

const SPORT_ICONS = {
  cricket: '🏏', football: '⚽', nba: '🏀', tennis: '🎾', f1: '🏎️',
};

export default function SportHeroBanner({ matches = [] }) {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [animating, setAnimating] = useState(false);

  // Prefer live matches for the hero
  const featured = matches.filter(m => m.status === 'live');
  const heroMatches = featured.length > 0 ? featured : matches.slice(0, 3);

  useEffect(() => {
    if (heroMatches.length <= 1) return;
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setIdx(i => (i + 1) % heroMatches.length);
        setAnimating(false);
      }, 400);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroMatches.length]);

  if (!heroMatches.length) return null;

  const match = heroMatches[idx % heroMatches.length];
  const grad = SPORT_GRADIENTS[match.sport] || SPORT_GRADIENTS.default;
  const accent = SPORT_ACCENT[match.sport] || SPORT_ACCENT.default;
  const icon = SPORT_ICONS[match.sport] || '🏟️';
  const isLive = match.status === 'live';

  return (
    <div
      className={cn(
        'relative mb-8 overflow-hidden rounded-2xl border border-border cursor-pointer select-none',
        'transition-all duration-700',
        animating ? 'opacity-0 scale-[0.99]' : 'opacity-100 scale-100'
      )}
      style={{ background: 'linear-gradient(135deg, #0d1117 0%, #12151a 100%)' }}
      onClick={() => navigate(`/match/${match.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && navigate(`/match/${match.id}`)}
      aria-label={`View match: ${match.teamA?.name} vs ${match.teamB?.name}`}
    >
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-20 -left-20 h-64 w-64 rounded-full opacity-20 blur-3xl animate-pulse"
          style={{ background: accent }}
        />
        <div
          className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full opacity-10 blur-3xl"
          style={{ background: accent, animationDelay: '1s', animation: 'pulse 3s ease-in-out infinite' }}
        />
      </div>

      {/* Gradient overlay */}
      <div className={cn('absolute inset-0 bg-gradient-to-r', grad)} />

      {/* Grid lines decoration */}
      <div className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative z-10 p-6 sm:p-8">
        {/* Top row */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-white/60">
              {match.league || match.sport}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-400 border border-red-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                Live
              </span>
            )}
            {match.minute && (
              <span className="font-mono text-sm font-bold" style={{ color: accent }}>
                {match.minute}
              </span>
            )}
          </div>
        </div>

        {/* Score display */}
        <div className="flex items-center justify-between gap-4">
          <TeamBlock name={match.teamA?.name} score={match.teamA?.score} detail={match.teamA?.detail} flag={match.teamA?.flag} accent={accent} align="left" />

          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="font-mono text-2xl font-bold text-white/30">vs</span>
            {match.venue && (
              <span className="text-center text-[10px] text-white/40 max-w-[80px] leading-tight hidden sm:block">
                {match.venue.split(',')[0]}
              </span>
            )}
          </div>

          <TeamBlock name={match.teamB?.name} score={match.teamB?.score} detail={match.teamB?.detail} flag={match.teamB?.flag} accent={accent} align="right" />
        </div>

        {/* Momentum bar */}
        {match.momentum != null && (
          <div className="mt-6">
            <div className="mb-1 flex justify-between text-[10px] text-white/40">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" style={{ color: accent }} />
                {match.teamA?.name?.split(' ')[0]} {Math.round(match.momentum)}%
              </span>
              <span>{match.teamB?.name?.split(' ')[0]} {100 - Math.round(match.momentum)}%</span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${match.momentum}%`, background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}
              />
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-white/40">
            <Radio className="h-3 w-3" />
            <span>Click for full match analysis</span>
          </div>

          {/* Dot indicators */}
          {heroMatches.length > 1 && (
            <div className="flex gap-1.5">
              {heroMatches.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setIdx(i); }}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === idx % heroMatches.length ? 'w-4 bg-white' : 'w-1.5 bg-white/30'
                  )}
                  aria-label={`Go to match ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hover shimmer */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%)' }}
      />
    </div>
  );
}

function TeamBlock({ name, score, detail, flag, accent, align }) {
  return (
    <div className={cn('flex flex-col gap-1', align === 'right' && 'items-end text-right')}>
      <div className="flex items-center gap-2" style={align === 'right' ? { flexDirection: 'row-reverse' } : {}}>
        {flag && <span className="text-xl sm:text-2xl">{flag}</span>}
        <span className="text-sm font-medium text-white/70 max-w-[120px] leading-tight">{name}</span>
      </div>
      <span
        className="font-mono text-3xl sm:text-4xl font-black tracking-tight"
        style={{ color: score && score !== '-' ? 'white' : 'rgba(255,255,255,0.2)' }}
      >
        {score || '–'}
      </span>
      {detail && <span className="text-xs font-mono" style={{ color: accent }}>{detail}</span>}
    </div>
  );
}
