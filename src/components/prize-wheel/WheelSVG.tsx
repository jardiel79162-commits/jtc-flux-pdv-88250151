export const PRIZES = [
  { label: "Não Foi Dessa Vez", emoji: "😥", color: "#4b5563", colorDark: "#374151", weight: 75, days: 0 },
  { label: "1 Semana Grátis", emoji: "🎁", color: "#3b82f6", colorDark: "#2563eb", weight: 10, days: 7 },
  { label: "1 Mês Grátis", emoji: "🎁", color: "#8b5cf6", colorDark: "#7c3aed", weight: 6, days: 30 },
  { label: "1 Ano Grátis", emoji: "🎉", color: "#f59e0b", colorDark: "#d97706", weight: 4, days: 365 },
  { label: "2 Anos Grátis", emoji: "🎉", color: "#ef4444", colorDark: "#dc2626", weight: 3, days: 730 },
  { label: "3 Anos Grátis", emoji: "🎉", color: "#ec4899", colorDark: "#db2777", weight: 1.5, days: 1095 },
  { label: "Acesso Ilimitado", emoji: "🚀", color: "#10b981", colorDark: "#059669", weight: 0.5, days: 36500 },
];

export const NUM_SLICES = PRIZES.length;
export const SLICE_DEG = 360 / NUM_SLICES;

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, s: number, e: number) {
  const start = polar(cx, cy, r, e);
  const end = polar(cx, cy, r, s);
  const large = e - s > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

export const WheelSVG = () => {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 10;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
      <defs>
        {PRIZES.map((p, i) => (
          <linearGradient key={i} id={`sg${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={p.color} />
            <stop offset="100%" stopColor={p.colorDark} />
          </linearGradient>
        ))}
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="50%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      <circle cx={cx} cy={cy} r={R + 6} fill="none" stroke="url(#ringGrad)" strokeWidth="5" />

      {Array.from({ length: 28 }).map((_, i) => {
        const a = (i * 360) / 28;
        const p1 = polar(cx, cy, R + 2, a);
        const p2 = polar(cx, cy, R - 3, a);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />;
      })}

      {PRIZES.map((prize, i) => {
        const startA = i * SLICE_DEG;
        const endA = startA + SLICE_DEG;
        const midA = startA + SLICE_DEG / 2;

        return (
          <g key={i}>
            <path d={arcPath(cx, cy, R, startA, endA)} fill={`url(#sg${i})`} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
            <g transform={`rotate(${midA}, ${cx}, ${cy})`}>
              <text x={cx} y={cy - R * 0.75} textAnchor="middle" dominantBaseline="central" fontSize="20">
                {prize.emoji}
              </text>
              <text
                x={cx}
                y={cy - R * 0.5}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="9.5"
                fontWeight="bold"
                fill="#fff"
                style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.7))" }}
              >
                {prize.label}
              </text>
            </g>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r="34" fill="#1e293b" stroke="rgba(255,255,255,0.6)" strokeWidth="3" />
    </svg>
  );
};
