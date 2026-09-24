import * as React from "react";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const M: Record<string, React.ReactNode> = {
  lensC: (<svg width="58" height="80" viewBox="0 0 58 80" {...P}><path d="M29 6 Q43 40 29 74 Q15 40 29 6 Z" /><path d="M4 26 H29 M29 26 L56 40 M4 54 H29 M29 54 L56 40" /><circle cx="56" cy="40" r="2" fill="currentColor" /></svg>),
  lensD: (<svg width="46" height="80" viewBox="0 0 46 80" {...P}><path d="M12 6 H34 Q24 40 34 74 H12 Q22 40 12 6 Z" /><path d="M2 40 H12 M34 40 L44 34 M34 40 L44 46" /></svg>),
  wave: (<svg width="120" height="44" viewBox="0 0 120 44" {...P}><path d="M4 22 Q19 1 34 22 Q49 43 64 22 Q79 1 94 22 Q109 43 120 22" /></svg>),
  prism: (<svg width="104" height="80" viewBox="0 0 104 80" {...P}><path d="M54 12 L34 66 L74 66 Z" /><path d="M6 42 H44 M62 48 L100 32 M62 48 L100 44 M62 48 L100 58" /></svg>),
  atom: (<svg width="84" height="84" viewBox="0 0 84 84" {...P}><circle cx="42" cy="42" r="3.5" fill="currentColor" /><ellipse cx="42" cy="42" rx="36" ry="14" /><ellipse cx="42" cy="42" rx="36" ry="14" transform="rotate(60 42 42)" /><ellipse cx="42" cy="42" rx="36" ry="14" transform="rotate(120 42 42)" /></svg>),
  magnet: (<svg width="50" height="56" viewBox="0 0 50 56" {...P} strokeWidth={3}><path d="M9 6 V28 a16 16 0 0 0 32 0 V6" /><path d="M9 6 h9 M32 6 h9" /></svg>),
  thermo: (<svg width="24" height="60" viewBox="0 0 24 60" {...P}><rect x="8" y="4" width="8" height="38" rx="4" /><circle cx="12" cy="48" r="8" fill="currentColor" fillOpacity="0.5" /></svg>),
  ruler: (<svg width="76" height="26" viewBox="0 0 76 26" {...P}><rect x="2" y="6" width="72" height="14" rx="2" /><path d="M14 6 V14 M26 6 V11 M38 6 V14 M50 6 V11 M62 6 V14" /></svg>),
  mirror: (<svg width="62" height="54" viewBox="0 0 62 54" {...P}><path d="M6 48 H56" strokeWidth={3} /><path d="M14 8 L31 48 M31 48 L48 8" /><path d="M31 48 V6" strokeDasharray="3 3" /></svg>),
  bulb: (<svg width="36" height="48" viewBox="0 0 36 48" {...P}><circle cx="18" cy="17" r="13" /><path d="M18 6 L14 17 L22 21 L18 30" /><path d="M11 36 H25 M13 41 H23" /></svg>),
  vector: (<svg width="56" height="24" viewBox="0 0 56 24" {...P}><path d="M4 12 H48 M48 12 L39 6 M48 12 L39 18" /></svg>),
  spring: (<svg width="40" height="60" viewBox="0 0 40 60" {...P}><path d="M20 2 V8 L10 13 L30 19 L10 25 L30 31 L20 36" /><rect x="8" y="38" width="24" height="16" rx="3" /></svg>),
};

// 全屏散布：left/top 用百分比，错落分布覆盖整个背景
type Item = { k: string; l: number; t: number; rot: number; sc: number; op: number };
const ITEMS: Item[] = [
  { k: "lensC", l: 3, t: 5, rot: -8, sc: 1, op: 0.12 },
  { k: "wave", l: 25, t: 3, rot: 5, sc: 0.9, op: 0.1 },
  { k: "prism", l: 50, t: 6, rot: 8, sc: 0.9, op: 0.1 },
  { k: "v = λf", l: 73, t: 4, rot: -4, sc: 1, op: 0.13 },
  { k: "atom", l: 90, t: 8, rot: 0, sc: 0.8, op: 0.1 },
  { k: "ruler", l: 11, t: 19, rot: 8, sc: 1, op: 0.11 },
  { k: "magnet", l: 39, t: 17, rot: -10, sc: 1, op: 0.1 },
  { k: "bulb", l: 63, t: 20, rot: 6, sc: 1, op: 0.11 },
  { k: "λ", l: 87, t: 22, rot: -6, sc: 1, op: 0.12 },
  { k: "spring", l: 4, t: 35, rot: 4, sc: 1, op: 0.1 },
  { k: "lensD", l: 29, t: 33, rot: 6, sc: 0.95, op: 0.11 },
  { k: "wave", l: 55, t: 36, rot: -6, sc: 0.85, op: 0.09 },
  { k: "thermo", l: 79, t: 34, rot: -12, sc: 1.1, op: 0.11 },
  { k: "ρ = m/V", l: 13, t: 49, rot: -5, sc: 1, op: 0.13 },
  { k: "mirror", l: 43, t: 51, rot: 9, sc: 1, op: 0.1 },
  { k: "atom", l: 69, t: 49, rot: 12, sc: 0.8, op: 0.09 },
  { k: "vector", l: 90, t: 52, rot: -14, sc: 1.1, op: 0.11 },
  { k: "prism", l: 7, t: 65, rot: 8, sc: 0.9, op: 0.1 },
  { k: "lensC", l: 33, t: 67, rot: -8, sc: 0.95, op: 0.11 },
  { k: "bulb", l: 59, t: 65, rot: 6, sc: 1, op: 0.1 },
  { k: "ruler", l: 83, t: 66, rot: 8, sc: 1, op: 0.11 },
  { k: "wave", l: 17, t: 81, rot: 6, sc: 0.9, op: 0.1 },
  { k: "v = s/t", l: 45, t: 83, rot: -4, sc: 1, op: 0.12 },
  { k: "magnet", l: 71, t: 81, rot: -10, sc: 1, op: 0.1 },
  { k: "atom", l: 90, t: 84, rot: 0, sc: 0.8, op: 0.09 },
  { k: "thermo", l: 5, t: 91, rot: -12, sc: 1, op: 0.1 },
  { k: "spring", l: 37, t: 92, rot: 4, sc: 1, op: 0.1 },
  { k: "λ", l: 63, t: 91, rot: -6, sc: 1, op: 0.12 },
  { k: "lensD", l: 87, t: 92, rot: 6, sc: 0.95, op: 0.11 },
];

/** 全屏背景物理主题点缀：置于内容之后(-z-10)，仅在内容留白处透出；手机端(< md)隐藏。 */
export function PhysicsDecor() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 hidden select-none overflow-hidden text-violet-500 md:block dark:text-violet-300">
      {ITEMS.map((it, i) => (
        <span key={i} className="absolute font-mono text-base tracking-wide"
          style={{ top: `${it.t}%`, left: `${it.l}%`, transform: `rotate(${it.rot}deg) scale(${it.sc})`, opacity: it.op }}>
          {M[it.k] ?? it.k}
        </span>
      ))}
    </div>
  );
}
