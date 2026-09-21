import { useEffect, useRef } from 'react';

// Pure canvas/SVG chart components — zero external dependencies

// ── Donut Chart ────────────────────────────────────────────────────────────
export function DonutChart({ segments = [], size = 140, label = '', sublabel = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const s = size * dpr;
    canvas.width = s;
    canvas.height = s;
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2;
    const outerR = size / 2 - 8;
    const innerR = outerR * 0.62;
    const total = segments.reduce((a, s) => a + s.value, 0);

    ctx.clearRect(0, 0, size, size);

    // Draw shadow
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 12;

    let angle = -Math.PI / 2;
    segments.forEach((seg) => {
      const slice = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      angle += slice;
    });

    ctx.shadowBlur = 0;

    // Inner hole
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fillStyle = '#12151a';
    ctx.fill();

    // Gap lines
    angle = -Math.PI / 2;
    segments.forEach((seg) => {
      const slice = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR);
      ctx.strokeStyle = '#0b0d10';
      ctx.lineWidth = 2;
      ctx.stroke();
      angle += slice;
    });
  }, [segments, size]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <canvas ref={canvasRef} style={{ width: size, height: size }} />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-2xl font-black text-foreground">{label}</span>
        <span className="text-[10px] text-muted">{sublabel}</span>
      </div>
    </div>
  );
}

// ── Bar Chart ──────────────────────────────────────────────────────────────
export function BarChart({ bars = [], maxHeight = 100, color = '#00c2ff', secondColor = '#334155' }) {
  if (!bars.length) return null;
  const max = Math.max(...bars.map(b => Math.max(b.a || 0, b.b || 0)), 1);

  return (
    <div className="flex h-full items-end gap-1.5">
      {bars.map((bar, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full items-end gap-0.5" style={{ height: maxHeight }}>
            {/* Bar A */}
            <div
              className="flex-1 rounded-t-sm transition-all duration-700"
              style={{
                height: `${((bar.a || 0) / max) * 100}%`,
                background: color,
                opacity: 0.9,
                transitionDelay: `${i * 40}ms`,
              }}
            />
            {/* Bar B (if exists) */}
            {bar.b !== undefined && (
              <div
                className="flex-1 rounded-t-sm transition-all duration-700"
                style={{
                  height: `${((bar.b || 0) / max) * 100}%`,
                  background: secondColor,
                  opacity: 0.7,
                  transitionDelay: `${i * 40 + 20}ms`,
                }}
              />
            )}
          </div>
          {bar.label && (
            <span className="text-[9px] text-muted truncate w-full text-center">{bar.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Radar / Spider Chart ───────────────────────────────────────────────────
export function RadarChart({ axes = [], size = 160, color = '#00c2ff' }) {
  const canvasRef = useRef(null);
  const cx = size / 2, cy = size / 2;
  const maxR = size / 2 - 20;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !axes.length) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const n = axes.length;
    const angleStep = (Math.PI * 2) / n;

    // Draw grid rings
    [0.25, 0.5, 0.75, 1].forEach(scale => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = i * angleStep - Math.PI / 2;
        const x = cx + Math.cos(a) * maxR * scale;
        const y = cy + Math.sin(a) * maxR * scale;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw axes
    for (let i = 0; i < n; i++) {
      const a = i * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw data polygon
    ctx.beginPath();
    axes.forEach(({ value }, i) => {
      const a = i * angleStep - Math.PI / 2;
      const r = maxR * Math.min(1, Math.max(0, value / 100));
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = `${color}30`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw dots + labels
    axes.forEach(({ value, label }, i) => {
      const a = i * angleStep - Math.PI / 2;
      const r = maxR * Math.min(1, Math.max(0, value / 100));
      const dotX = cx + Math.cos(a) * r;
      const dotY = cy + Math.sin(a) * r;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label at outer edge
      const lx = cx + Math.cos(a) * (maxR + 12);
      const ly = cy + Math.sin(a) * (maxR + 12);
      ctx.font = `bold ${size < 140 ? 8 : 9}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = lx > cx + 5 ? 'left' : lx < cx - 5 ? 'right' : 'center';
      ctx.textBaseline = ly > cy + 5 ? 'top' : ly < cy - 5 ? 'bottom' : 'middle';
      ctx.fillText(label, lx, ly);
    });
  }, [axes, size, color, cx, cy, maxR]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
    />
  );
}

// ── Sparkline ──────────────────────────────────────────────────────────────
export function Sparkline({ points = [], color = '#00c2ff', height = 40, width = 120 }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pad = 4;

  const toX = (i) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const toY = (v) => height - pad - ((v - min) / range) * (height - pad * 2);

  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ');
  const fillPath = `${path} L ${toX(points.length - 1)} ${height} L ${toX(0)} ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#spGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Last point dot */}
      <circle cx={toX(points.length - 1)} cy={toY(points[points.length - 1])} r="2.5" fill={color} />
    </svg>
  );
}
