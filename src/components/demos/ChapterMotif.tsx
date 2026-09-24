const P = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** 各章契合的小图案（1机械运动…6质量密度），用 currentColor 随方块底色着色。 */
export function ChapterMotif({ n, className }: { n: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...P} aria-hidden>
      {n === 1 && (<>
        <path d="M6 30 h30 l-4 -9 h-18 z" /><circle cx="15" cy="33" r="3.5" /><circle cx="31" cy="33" r="3.5" />
        <path d="M2 20 h8 M2 26 h6" />
      </>)}
      {n === 2 && (<>
        <path d="M12 24 h6 l7 -7 v14 l-7 -7" /><path d="M30 17 a10 10 0 0 1 0 14" /><path d="M35 13 a16 16 0 0 1 0 22" />
      </>)}
      {n === 3 && (<>
        <path d="M18 8 c6 8 6 12 0 16 c-6 -4 -6 -8 0 -16 z" /><path d="M34 22 v16 M27 30 h14 M29 25 l10 10 M39 25 l-10 10" />
      </>)}
      {n === 4 && (<>
        <path d="M20 8 L10 34 L30 34 Z" /><path d="M2 22 h13" /><path d="M23 26 l18 -6 M23 26 l18 2 M23 26 l16 10" />
      </>)}
      {n === 5 && (<>
        <path d="M24 8 Q32 24 24 40 Q16 24 24 8 Z" /><path d="M4 16 h16 M4 24 h16 M4 32 h16 M28 20 L44 24 M28 28 L44 24" />
      </>)}
      {n === 6 && (<>
        <path d="M24 8 v30 M12 40 h24" /><path d="M24 12 L10 20 M24 12 L38 20" /><path d="M6 20 a4 4 0 0 0 8 0 M34 20 a4 4 0 0 0 8 0" />
      </>)}
    </svg>
  );
}
