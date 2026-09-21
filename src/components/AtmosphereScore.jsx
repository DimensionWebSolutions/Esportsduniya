import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const SPORT_COLORS = {
  cricket: '#22c55e', football: '#3b82f6', nba: '#f97316',
  tennis: '#eab308', f1: '#ef4444', default: '#00c2ff',
};

const EVENT_ICONS = {
  goal: '⚽', wicket: '🎯', six: '💥', ace: '🎾', overtake: '🏎️',
  foul: '🟨', try: '🏉', basket: '🏀', default: '⚡',
};

function AtmosphereGauge({ score, color }) {
  const size = 140;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75; // 270° arc
  const dash = (score / 100) * arc;
  const offset = circ * 0.125; // start at 135°

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(135deg)' }}>
        {/* Track */}
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeDashoffset={-offset}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={-offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ transform: 'translateY(8px)' }}>
        <span className="font-mono text-3xl font-black" style={{ color }}>{score}</span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-white/40">Atmos</span>
      </div>
    </div>
  );
}

function EventFeed({ events }) {
  return (
    <div className="flex-1 overflow-hidden">
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-xs text-white/30 italic">Waiting for key moments…</p>
        ) : (
          events.map((ev, i) => (
            <div
              key={i}
              className={cn(
                'flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs',
                'bg-white/5 border border-white/5',
                i === 0 && 'bg-white/10 border-white/10 animate-pulse-once'
              )}
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <span className="text-base shrink-0 mt-0.5">
                {EVENT_ICONS[ev.type] || EVENT_ICONS.default}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-white/80 leading-tight">{ev.text}</p>
                {ev.time && (
                  <p className="font-mono text-white/30 text-[10px] mt-0.5">{ev.time}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AtmosphereScore({ match }) {
  const [score, setScore] = useState(0);
  const [events, setEvents] = useState([]);
  const targetRef = useRef(0);

  const sport = match?.sport || 'default';
  const color = SPORT_COLORS[sport] || SPORT_COLORS.default;

  // Build atmosphere score from match data
  useEffect(() => {
    if (!match) return;
    const base = match.momentum != null ? Math.round(match.momentum * 0.6 + 30) : 60;
    const isLive = match.status === 'live';
    const computed = isLive ? Math.min(98, base + Math.floor(Math.random() * 12)) : Math.max(20, base - 20);
    targetRef.current = computed;

    // Animate gauge
    let current = score;
    const step = () => {
      if (Math.abs(current - targetRef.current) < 1) {
        setScore(targetRef.current);
        return;
      }
      current += (targetRef.current - current) * 0.08;
      setScore(Math.round(current));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [match?.momentum, match?.status]);

  // Generate mock key events from timeline
  useEffect(() => {
    if (!match) return;
    const generated = [];
    if (match.sport === 'cricket' && match.teamA?.score) {
      generated.push({ type: 'six', text: `${match.teamA.name} — Power hitting phase`, time: match.teamA.detail || 'Now' });
    }
    if (match.sport === 'football' && match.teamA?.score > 0) {
      generated.push({ type: 'goal', text: `Goal! ${match.teamA.name}`, time: match.minute || '' });
    }
    if (match.status === 'live') {
      generated.push({ type: 'default', text: `Match heating up — momentum at ${match.momentum || 50}%`, time: 'Live' });
    }
    setEvents(generated);
  }, [match]);

  const label = score >= 80 ? 'Electrifying' : score >= 60 ? 'Intense' : score >= 40 ? 'Building' : 'Calm';

  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5" style={{ background: 'linear-gradient(135deg, #12151a, #0d1117)' }}>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-lg">🏟️</span>
        <h3 className="font-display font-semibold text-white">Atmosphere</h3>
        <span
          className="ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
        >
          {label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <AtmosphereGauge score={score} color={color} />
        <EventFeed events={events} />
      </div>

      {/* Intensity bars */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Crowd', val: Math.min(100, score + 5) },
          { label: 'Tension', val: Math.min(100, score - 5) },
          { label: 'Energy', val: Math.min(100, Math.round(score * 0.9 + 8)) },
        ].map(({ label: l, val }) => (
          <div key={l}>
            <div className="mb-1 flex justify-between text-[10px] text-white/40">
              <span>{l}</span>
              <span className="font-mono">{val}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${val}%`, background: color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
