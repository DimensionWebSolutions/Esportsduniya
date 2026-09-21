import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useLiveScores } from '@/hooks/useLiveScores';

const SPORT_COLORS = {
  cricket:  '#22c55e',
  football: '#3b82f6',
  nba:      '#f97316',
  tennis:   '#eab308',
  f1:       '#ef4444',
};

const SPORT_ICONS = {
  cricket: '🏏', football: '⚽', nba: '🏀', tennis: '🎾', f1: '🏎️',
};

function TickerItem({ match, onClick }) {
  const color = SPORT_COLORS[match.sport] || '#00c2ff';
  const icon = SPORT_ICONS[match.sport] || '🏟️';
  const isLive = match.status === 'live';

  return (
    <button
      onClick={() => onClick(match)}
      className="flex shrink-0 items-center gap-2 border-r border-white/10 px-4 py-0 h-full hover:bg-white/5 transition-colors group"
      aria-label={`${match.teamA?.name} vs ${match.teamB?.name}`}
    >
      <span className="text-sm">{icon}</span>
      <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
        <span className="text-white/60 font-medium">{match.teamA?.name?.split(' ').slice(-1)[0]}</span>
        <span className="font-mono font-bold" style={{ color }}>
          {match.teamA?.score || '–'}
        </span>
        <span className="text-white/30 font-mono">·</span>
        <span className="font-mono font-bold" style={{ color }}>
          {match.teamB?.score || '–'}
        </span>
        <span className="text-white/60 font-medium">{match.teamB?.name?.split(' ').slice(-1)[0]}</span>
      </div>
      {isLive && (
        <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
      )}
    </button>
  );
}

export default function LiveScoreTicker() {
  const navigate = useNavigate();
  const { data } = useLiveScores('all');
  const tickerRef = useRef(null);
  const animFrameRef = useRef(null);
  const posRef = useRef(0);
  const [paused, setPaused] = useState(false);

  const matches = (data?.matches || []).filter(m => m.status === 'live');

  useEffect(() => {
    const el = tickerRef.current;
    if (!el || matches.length === 0) return;

    const speed = 0.5; // px per frame

    const tick = () => {
      if (!paused) {
        posRef.current += speed;
        const maxScroll = el.scrollWidth / 2;
        if (posRef.current >= maxScroll) posRef.current = 0;
        el.style.transform = `translateX(-${posRef.current}px)`;
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [matches.length, paused]);

  if (matches.length === 0) return null;

  // Duplicate items for seamless loop
  const items = [...matches, ...matches, ...matches];

  return (
    <div
      className="relative flex h-8 items-center overflow-hidden border-b border-white/5 bg-surface-1/80 backdrop-blur-sm z-30"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Live score ticker"
    >
      {/* Label */}
      <div className="flex shrink-0 items-center gap-1.5 border-r border-white/10 bg-red-500/10 px-3 h-full">
        <Radio className="h-3 w-3 text-red-400 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Live</span>
      </div>

      {/* Scrolling ticker */}
      <div className="flex-1 overflow-hidden h-full">
        <div
          ref={tickerRef}
          className="flex h-full items-center will-change-transform"
          style={{ width: 'max-content' }}
        >
          {items.map((match, i) => (
            <TickerItem
              key={`${match.id}-${i}`}
              match={match}
              onClick={(m) => navigate(`/match/${m.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
