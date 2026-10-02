import { rng, r2 } from "./rng";

type Pt = [number, number];
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

// Gold veins, roughly where they sit on the invitation (top-right ribbons, lower-left ribbons)
const VEINS: [Pt, Pt, Pt, Pt][] = [
  [[1010, -20], [880, 90], [930, 220], [800, 330]],
  [[1020, 160], [900, 230], [870, 300], [760, 360]],
  [[640, -10], [700, 40], [760, 30], [840, 70]],
  [[-20, 760], [90, 700], [120, 820], [230, 900]],
  [[-10, 900], [60, 860], [140, 960], [210, 1010]],
  [[420, 1010], [520, 960], [560, 990], [660, 940]],
];

function veinPath([a, b, c, d]: [Pt, Pt, Pt, Pt]) {
  return `M${a[0]} ${a[1]} C${b[0]} ${b[1]} ${c[0]} ${c[1]} ${d[0]} ${d[1]}`;
}

export default function Backdrop() {
  const rand = rng(11);
  const sparkles = VEINS.flatMap((v, vi) =>
    Array.from({ length: 22 }, (_, i) => {
      const [x, y] = bez(...v, (i + rand()) / 22);
      return { x: r2(x + (rand() - 0.5) * 14), y: r2(y + (rand() - 0.5) * 14), r: r2(0.6 + rand() * 1.6), d: r2(rand() * 3.6), k: `${vi}-${i}` };
    }),
  );
  const petals = Array.from({ length: 11 }, (_, i) => ({
    left: r2(rand() * 100),
    dur: r2(18 + rand() * 16),
    delay: r2(-rand() * 30),
    size: r2(10 + rand() * 12),
    drift: Math.round((rand() - 0.5) * 160),
    kind: i % 3,
  }));

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* soft ink washes */}
      <div
        className="ink-drift absolute -inset-[10%]"
        style={{
          background: `
            radial-gradient(38% 30% at 85% 12%, rgba(214,196,180,.75), transparent 70%),
            radial-gradient(30% 26% at 70% 30%, rgba(228,214,201,.7), transparent 70%),
            radial-gradient(34% 30% at 8% 82%, rgba(214,198,183,.7), transparent 70%),
            radial-gradient(28% 22% at 30% 98%, rgba(222,207,193,.65), transparent 70%),
            radial-gradient(40% 30% at 15% 10%, rgba(233,227,214,.8), transparent 70%),
            radial-gradient(30% 25% at 95% 75%, rgba(226,214,203,.6), transparent 70%),
            #f3efea`,
        }}
      />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <defs>
          <filter id="ink" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.011" numOctaves="4" seed="7" />
            <feColorMatrix values="0 0 0 0 0.62  0 0 0 0 0.52  0 0 0 0 0.45  0 0 0 -1.6 1.05" />
            <feGaussianBlur stdDeviation="2" />
          </filter>
          <linearGradient id="vein" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c99a82" />
            <stop offset=".5" stopColor="#f2d6c2" />
            <stop offset="1" stopColor="#b98069" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="1.2" /></filter>
        </defs>
        <rect width="1000" height="1000" filter="url(#ink)" opacity=".22" />
        {VEINS.map((v, i) => (
          <g key={i}>
            <path d={veinPath(v)} stroke="#e8c3ad" strokeWidth="6" fill="none" opacity=".25" filter="url(#glow)" />
            <path d={veinPath(v)} stroke="url(#vein)" strokeWidth="1.2" fill="none" opacity=".8" />
            <path d={veinPath(v)} stroke="#fff3ea" strokeWidth="2.2" fill="none" className="vein-glint" strokeLinecap="round" style={{ animationDelay: `${-i * 1.7}s` }} />
          </g>
        ))}
        {sparkles.map((s) => (
          <circle key={s.k} cx={s.x} cy={s.y} r={s.r} fill="#f0cdb7" className="sparkle" style={{ animationDelay: `${s.d}s` }} />
        ))}
      </svg>
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={{ left: `${p.left}%`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, ["--drift" as string]: `${p.drift}px` }}
        >
          <svg width={p.size} height={p.size} viewBox="0 0 20 20">
            {p.kind === 0 && <path d="M10 1C15 5 17 12 10 19C3 12 5 5 10 1Z" fill="#efdccb" stroke="#d9bba6" strokeWidth=".6" opacity=".9" />}
            {p.kind === 1 && <path d="M10 2C16 6 16 14 10 18C6 14 5 7 10 2Z" fill="#b9c4a4" opacity=".75" />}
            {p.kind === 2 && <ellipse cx="10" cy="10" rx="6" ry="8" fill="#f6e9df" stroke="#e1c5b3" strokeWidth=".6" />}
          </svg>
        </span>
      ))}
    </div>
  );
}
