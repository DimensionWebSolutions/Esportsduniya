import { useMemo } from 'react';

const CITY_POSITIONS = {
  Mumbai:       { cx: 66, cy: 46 },
  London:       { cx: 48, cy: 24 },
  Melbourne:    { cx: 83, cy: 73 },
  'New York':   { cx: 22, cy: 30 },
  'São Paulo':  { cx: 30, cy: 62 },
  Tokyo:        { cx: 83, cy: 32 },
  Dubai:        { cx: 61, cy: 40 },
  Lagos:        { cx: 50, cy: 51 },
  Paris:        { cx: 50, cy: 23 },
  Beijing:      { cx: 79, cy: 29 },
  'Los Angeles':{ cx: 14, cy: 34 },
  Cairo:        { cx: 56, cy: 38 },
  Karachi:      { cx: 64, cy: 40 },
  Dhaka:        { cx: 70, cy: 43 },
};

const SPORT_COLORS = {
  cricket:  '#22c55e',
  football: '#3b82f6',
  nba:      '#f97316',
  tennis:   '#eab308',
  f1:       '#ef4444',
  all:      '#00c2ff',
};

export default function WorldFanMap({ regions = [], activeSport = 'all' }) {
  const color = SPORT_COLORS[activeSport] || SPORT_COLORS.all;

  const dots = useMemo(() => {
    return regions.map(region => {
      const pos = CITY_POSITIONS[region.name];
      if (!pos) return null;
      const intensity = region.intensity || 50;
      return { ...region, ...pos, intensity, color };
    }).filter(Boolean);
  }, [regions, color]);

  return (
    <div className="relative rounded-2xl border border-border bg-surface-1 overflow-hidden" style={{ aspectRatio: '2/1' }}>
      {/* SVG World Map (simplified continental outlines) */}
      <svg
        viewBox="0 0 100 50"
        className="absolute inset-0 h-full w-full"
        style={{ opacity: 0.15 }}
        aria-hidden="true"
      >
        {/* North America */}
        <path d="M 8 12 L 28 10 L 30 20 L 24 28 L 18 30 L 10 24 Z" fill="currentColor" className="text-white" />
        {/* South America */}
        <path d="M 22 32 L 32 30 L 34 46 L 26 48 L 20 42 Z" fill="currentColor" className="text-white" />
        {/* Europe */}
        <path d="M 44 10 L 58 10 L 58 22 L 50 24 L 44 20 Z" fill="currentColor" className="text-white" />
        {/* Africa */}
        <path d="M 46 24 L 60 24 L 62 46 L 50 48 L 44 40 Z" fill="currentColor" className="text-white" />
        {/* Asia */}
        <path d="M 58 8 L 88 8 L 90 36 L 78 38 L 62 32 L 58 20 Z" fill="currentColor" className="text-white" />
        {/* Australia */}
        <path d="M 78 42 L 92 40 L 92 50 L 80 50 Z" fill="currentColor" className="text-white" />
        {/* Grid lines */}
        {[20, 40, 60, 80].map(x => (
          <line key={`v${x}`} x1={x} y1="0" x2={x} y2="50" stroke="currentColor" strokeWidth="0.2" className="text-white" />
        ))}
        {[12, 25, 38].map(y => (
          <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} stroke="currentColor" strokeWidth="0.2" className="text-white" />
        ))}
      </svg>

      {/* Fan dots */}
      <svg viewBox="0 0 100 50" className="absolute inset-0 h-full w-full" aria-label="World fan activity map">
        {dots.map((dot, i) => {
          const r = 0.6 + (dot.intensity / 100) * 1.4;
          const pulseR = r * 2.5;
          return (
            <g key={dot.name} className="group">
              {/* Outer pulse ring */}
              <circle
                cx={dot.cx}
                cy={dot.cy}
                r={pulseR}
                fill={dot.color}
                opacity="0"
                style={{
                  animation: `worldPulse 2.5s ease-out infinite`,
                  animationDelay: `${(i * 0.4) % 2.5}s`,
                }}
              />
              {/* Core dot */}
              <circle
                cx={dot.cx}
                cy={dot.cy}
                r={r}
                fill={dot.color}
                opacity="0.9"
              />
              {/* Tooltip on hover (SVG title) */}
              <title>{dot.name}: {dot.fans} fans · {dot.intensity}% intensity</title>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 rounded-lg border border-border/50 bg-surface-0/80 p-2 backdrop-blur-sm text-[10px]">
        {dots.slice(0, 5).map(dot => (
          <div key={dot.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: dot.color }} />
            <span className="text-muted">{dot.name}</span>
            <span className="font-mono font-bold ml-auto" style={{ color: dot.color }}>{dot.intensity}%</span>
          </div>
        ))}
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes worldPulse {
          0% { opacity: 0.6; transform: scale(0.8); }
          50% { opacity: 0.2; }
          100% { opacity: 0; transform: scale(1.6); }
        }
      `}</style>
    </div>
  );
}
