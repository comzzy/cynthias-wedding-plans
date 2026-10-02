/* Hand-built watercolor botanicals: cream roses, dried pampas, palm, eucalyptus, orchids.
   Everything is plain SVG with a turbulence "watercolor" filter, generated deterministically. */
import { rng, r2 } from "./rng";

type P = { id: string };

function Defs({ id }: P) {
  return (
    <defs>
      <filter id={`${id}-wc`} x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" result="d" />
        <feGaussianBlur in="d" stdDeviation="0.35" />
      </filter>
      <radialGradient id={`${id}-petal`} cx=".5" cy=".85" r=".9">
        <stop offset="0" stopColor="#e2c6ab" />
        <stop offset=".45" stopColor="#f2e3d2" />
        <stop offset="1" stopColor="#fbf5ee" />
      </radialGradient>
      <radialGradient id={`${id}-petalIn`} cx=".5" cy=".9" r=".9">
        <stop offset="0" stopColor="#c99f80" />
        <stop offset=".6" stopColor="#ead3bd" />
        <stop offset="1" stopColor="#f7ebdf" />
      </radialGradient>
      <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c9d3a6" />
        <stop offset=".55" stopColor="#9fb07a" />
        <stop offset="1" stopColor="#7d8f5c" />
      </linearGradient>
      <linearGradient id={`${id}-dry`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#9b6a47" />
        <stop offset=".6" stopColor="#c08e66" />
        <stop offset="1" stopColor="#e1bf9c" />
      </linearGradient>
      <linearGradient id={`${id}-fan`} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#a99689" />
        <stop offset="1" stopColor="#ddd1c6" />
      </linearGradient>
      <linearGradient id={`${id}-strand`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#efe2c6" />
        <stop offset=".7" stopColor="#e3cfa6" />
        <stop offset="1" stopColor="#e3cfa6" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

const PETAL = "M0 0 C-27 -3 -31 -40 0 -46 C31 -40 27 -3 0 0Z";

function Rose({ id, x, y, s = 1, rot = 0 }: P & { x: number; y: number; s?: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} filter={`url(#${id}-wc)`}>
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <path key={a} d={PETAL} transform={`rotate(${a + 15}) translate(0 -4)`} fill={`url(#${id}-petal)`} stroke="#dcc0a8" strokeWidth=".7" />
      ))}
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d={PETAL} transform={`rotate(${a + 45}) scale(.7)`} fill={`url(#${id}-petal)`} stroke="#d6b79d" strokeWidth=".8" />
      ))}
      {[0, 90, 180, 270].map((a) => (
        <path key={a} d={PETAL} transform={`rotate(${a + 20}) scale(.42)`} fill={`url(#${id}-petalIn)`} stroke="#cda88b" strokeWidth="1" />
      ))}
      <path d="M-7 -1 C-8 -11 9 -12 8 -2 C7 6 -5 7 -5 0 C-5 -5 3 -6 3 -1" fill="none" stroke="#b98a69" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  );
}

function Hydrangea({ id, x, y, s = 1, seed = 1 }: P & { x: number; y: number; s?: number; seed?: number }) {
  const r = rng(seed);
  const florets = Array.from({ length: 52 }, () => {
    const a = r() * Math.PI * 2, d = Math.pow(r(), 0.8) * 46;
    return { x: r2(Math.cos(a) * d * 1.15), y: r2(Math.sin(a) * d * 0.85), rot: Math.round(r() * 90), sc: r2(0.75 + r() * 0.4) };
  }).sort((a, b) => a.y - b.y);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} filter={`url(#${id}-wc)`}>
      {florets.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.rot}) scale(${f.sc})`}>
          {[0, 90, 180, 270].map((a) => (
            <path key={a} d="M0 0 C-7 -2 -8 -11 0 -13 C8 -11 7 -2 0 0Z" transform={`rotate(${a})`} fill="#f7eee3" stroke="#dcc4ad" strokeWidth=".6" />
          ))}
          <circle r="1.6" fill="#c9a17f" />
        </g>
      ))}
    </g>
  );
}

function Pampas({ x, y, len = 160, bend = 30, angle = 0, seed = 2, color = "#e6d4b4" }: { x: number; y: number; len?: number; bend?: number; angle?: number; seed?: number; color?: string }) {
  const r = rng(seed);
  const pts: string[] = [];
  for (let i = 0; i < 150; i++) {
    const t = 0.22 + (i / 150) * 0.78;
    const sx = bend * Math.sin(t * Math.PI * 0.9) * t;
    const sy = -len * t;
    const side = i % 2 ? 1 : -1;
    const l = (10 + r() * 20) * Math.sin(Math.PI * (0.15 + 0.85 * t));
    pts.push(`M${r2(sx)} ${r2(sy)} q${r2(side * l * 0.6)} ${r2(-l * 0.4)} ${r2(side * l)} ${r2(-l * 0.9)}`);
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}><g className="sway-slow">
      <path d={`M0 0 Q${bend * 0.5} ${-len * 0.5} ${bend} ${-len}`} stroke="#c7ad86" strokeWidth="1.2" fill="none" />
      <path d={pts.join(" ")} stroke={color} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity=".75" />
    </g></g>
  );
}

function DryPalm({ id, x, y, s = 1, from = -150, to = -20, n = 15, seed = 3 }: P & { x: number; y: number; s?: number; from?: number; to?: number; n?: number; seed?: number }) {
  const r = rng(seed);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}><g className="sway">
      {Array.from({ length: n }, (_, i) => {
        const a = ((from + ((to - from) * i) / (n - 1)) * Math.PI) / 180;
        const L = 120 + r() * 70;
        const ex = Math.cos(a) * L, ey = Math.sin(a) * L;
        const cx = Math.cos(a + 0.12) * L * 0.55, cy = Math.sin(a + 0.12) * L * 0.55;
        return (
          <path key={i} d={`M0 0 Q${r2(cx)} ${r2(cy)} ${r2(ex)} ${r2(ey)} Q${r2(cx * 0.9 + 6)} ${r2(cy * 0.9 + 6)} 0 0Z`} fill={`url(#${id}-dry)`} stroke="#9b6a47" strokeWidth=".5" opacity=".92" />
        );
      })}
      <path d="M0 0 L-4 60" stroke="#9b6a47" strokeWidth="2.5" />
    </g></g>
  );
}

function SunPalm({ id, x, y, s = 1, rot = 0 }: P & { x: number; y: number; s?: number; rot?: number }) {
  const ribs = Array.from({ length: 13 }, (_, i) => -160 + i * 11.5);
  const R = 80;
  const edge = ribs.map((a, i) => {
    const rr = R + (i % 2 ? -6 : 4);
    return `${r2(Math.cos((a * Math.PI) / 180) * rr)} ${r2(Math.sin((a * Math.PI) / 180) * rr)}`;
  });
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} filter={`url(#${id}-wc)`}><g className="sway-slow">
      <path d={`M0 0 L${edge.join(" L")} Z`} fill={`url(#${id}-fan)`} stroke="#9f8d80" strokeWidth=".8" opacity=".9" />
      {ribs.map((a) => (
        <path key={a} d={`M0 0 L${r2(Math.cos((a * Math.PI) / 180) * R * 0.97)} ${r2(Math.sin((a * Math.PI) / 180) * R * 0.97)}`} stroke="#8f7e72" strokeWidth=".6" opacity=".7" />
      ))}
      <path d="M0 0 L2 70" stroke="#8f7e72" strokeWidth="2" />
    </g></g>
  );
}

function BigLeaf({ id, x, y, s = 1, rot = 0 }: P & { x: number; y: number; s?: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} filter={`url(#${id}-wc)`}>
      <path d="M0 0 C-45 -30 -50 -110 0 -170 C50 -110 45 -30 0 0Z" fill={`url(#${id}-leaf)`} opacity=".9" />
      <path d="M0 0 C-2 -60 -1 -120 0 -168" stroke="#6f7d5a" strokeWidth="1.2" fill="none" />
      {[30, 55, 80, 105, 130].map((h) => (
        <g key={h} stroke="#7f8f66" strokeWidth=".7" fill="none" opacity=".7">
          <path d={`M0 ${-h} q-18 -8 -30 -26`} />
          <path d={`M0 ${-h} q18 -8 30 -26`} />
        </g>
      ))}
    </g>
  );
}

function Eucalyptus({ x, y, len = 150, angle = 0, n = 8 }: { x: number; y: number; len?: number; angle?: number; n?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}><g className="sway">
      <path d={`M0 0 Q${len * 0.15} ${-len * 0.5} 0 ${-len}`} stroke="#8f9b80" strokeWidth="1.3" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 1) / (n + 1);
        const px = len * 0.15 * 2 * t * (1 - t) * 1, py = -len * t;
        const side = i % 2 ? 1 : -1;
        const rr = 9 + (1 - t) * 6;
        return <ellipse key={i} cx={r2(px + side * rr * 0.9)} cy={r2(py)} rx={r2(rr)} ry={r2(rr * 0.8)} fill={i % 3 ? "#b4c0a6" : "#a3b195"} stroke="#8b9a7c" strokeWidth=".5" opacity=".85" />;
      })}
    </g></g>
  );
}

function Twig({ x, y, angle = 0, seed = 5 }: { x: number; y: number; angle?: number; seed?: number }) {
  const r = rng(seed);
  const tips = Array.from({ length: 7 }, (_, i) => {
    const t = 0.3 + (i / 7) * 0.7;
    const side = i % 2 ? 1 : -1;
    return { sx: r2(t * 6), sy: r2(-t * 90), ex: r2(t * 6 + side * (14 + r() * 12)), ey: r2(-t * 90 - 10 - r() * 10) };
  });
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}><g className="sway-slow">
      <path d="M0 0 Q4 -45 6 -95" stroke="#9b7559" strokeWidth="1" fill="none" />
      {tips.map((t, i) => (
        <g key={i}>
          <path d={`M${t.sx} ${t.sy} L${t.ex} ${t.ey}`} stroke="#9b7559" strokeWidth=".7" />
          <circle cx={t.ex} cy={t.ey} r="2.3" fill="#b0805e" />
        </g>
      ))}
      <circle cx="6" cy="-97" r="2.6" fill="#b0805e" />
    </g></g>
  );
}

function Orchid({ x, y, s = 1, rot = 0 }: { x: number; y: number; s?: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {[-90, 30, 150].map((a) => (
        <path key={a} d="M0 0 C-7 -6 -7 -26 0 -32 C7 -26 7 -6 0 0Z" transform={`rotate(${a + 90})`} fill="#fbf4ec" stroke="#e0c7b1" strokeWidth=".7" />
      ))}
      {[-30, 210].map((a) => (
        <path key={a} d="M0 0 C-12 -6 -12 -26 0 -30 C12 -26 12 -6 0 0Z" transform={`rotate(${a + 90})`} fill="#fdf8f2" stroke="#e0c7b1" strokeWidth=".7" />
      ))}
      <path d="M-6 2 C-6 12 6 12 6 2 C3 -2 -3 -2 -6 2Z" fill="#e9a978" />
      <circle cx="0" cy="-1" r="2" fill="#c46b3e" />
    </g>
  );
}

function Strands({ id, x, y, seed = 9 }: P & { x: number; y: number; seed?: number }) {
  const r = rng(seed);
  return (
    <g transform={`translate(${x} ${y})`}><g className="sway-slow">
      {Array.from({ length: 6 }, (_, i) => {
        const L = 180 + r() * 120, w = 4 + r() * 4, dx = (r() - 0.5) * 40;
        return <path key={i} d={`M${i * 6} 0 C${i * 6 - 12} ${L * 0.3} ${i * 6 + dx} ${L * 0.6} ${i * 6 + dx * 0.5} ${L}`} stroke={`url(#${id}-strand)`} strokeWidth={r2(w)} strokeLinecap="round" fill="none" opacity=".9" />;
      })}
    </g></g>
  );
}

export function BouquetTopLeft({ className = "", id = "tl" }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 400 640" className={className} aria-hidden>
      <Defs id={id} />
      <Pampas x={130} y={260} len={240} bend={-70} angle={-22} seed={2} />
      <Pampas x={150} y={255} len={210} bend={-25} angle={0} seed={6} color="#ece0c6" />
      <Pampas x={170} y={250} len={170} bend={30} angle={18} seed={7} color="#e3cfae" />
      <Eucalyptus x={190} y={250} len={220} angle={64} n={10} />
      <Eucalyptus x={170} y={235} len={160} angle={28} n={8} />
      <Eucalyptus x={110} y={300} len={150} angle={-70} n={7} />
      <BigLeaf id={id} x={230} y={300} s={0.75} rot={58} />
      <BigLeaf id={id} x={120} y={320} s={0.6} rot={-48} />
      <Twig x={80} y={240} angle={-38} seed={8} />
      <Twig x={250} y={215} angle={48} seed={18} />
      <Strands id={id} x={75} y={330} seed={9} />
      <Strands id={id} x={110} y={360} seed={19} />
      <g transform="translate(270 185) rotate(28)">
        <path d="M0 0 C-16 -20 -12 -54 12 -68 C28 -46 23 -16 0 0Z" fill="#f4e4d8" stroke="#dcbca5" strokeWidth=".8" />
        <path d="M0 0 C3 -22 7 -44 12 -66" stroke="#d8b49c" strokeWidth=".8" fill="none" />
      </g>
      <Hydrangea id={id} x={95} y={300} s={1.2} seed={3} />
      <Rose id={id} x={215} y={255} s={1.15} rot={10} />
      <Rose id={id} x={160} y={390} s={1.05} rot={-20} />
      <Rose id={id} x={250} y={350} s={0.7} rot={40} />
      <Hydrangea id={id} x={205} y={430} s={0.55} seed={13} />
    </svg>
  );
}

export function BouquetBottomRight({ className = "", id = "br" }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 400 620" className={className} aria-hidden>
      <Defs id={id} />
      <DryPalm id={id} x={260} y={230} s={1.1} from={-178} to={-30} n={20} seed={3} />
      <Pampas x={250} y={340} len={220} bend={-30} angle={-14} seed={12} />
      <Pampas x={295} y={340} len={170} bend={20} angle={16} seed={13} color="#e9dbbf" />
      <SunPalm id={id} x={210} y={320} s={1.1} rot={-10} />
      <Eucalyptus x={180} y={480} len={190} angle={-62} n={9} />
      <Eucalyptus x={330} y={470} len={150} angle={50} n={7} />
      <Twig x={345} y={500} angle={28} seed={4} />
      <BigLeaf id={id} x={170} y={600} s={1.3} rot={-40} />
      <BigLeaf id={id} x={300} y={560} s={1.1} rot={24} />
      <BigLeaf id={id} x={240} y={600} s={0.9} rot={-5} />
      <Rose id={id} x={260} y={480} s={1} rot={15} />
      <Rose id={id} x={180} y={540} s={0.75} rot={-30} />
      <Rose id={id} x={330} y={560} s={0.7} rot={60} />
      <Orchid x={310} y={455} s={1.4} rot={10} />
      <Orchid x={215} y={575} s={1.3} rot={-15} />
      <Orchid x={290} y={590} s={1.2} rot={30} />
    </svg>
  );
}

export function Sprig({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 60" className={className} aria-hidden>
      <g transform="translate(60 52)">
        <Eucalyptus x={0} y={0} len={48} angle={-60} n={5} />
        <Eucalyptus x={0} y={0} len={48} angle={60} n={5} />
        <circle cx="0" cy="-4" r="5" fill="#f3e5d6" stroke="#d6b79d" strokeWidth=".8" />
      </g>
    </svg>
  );
}
