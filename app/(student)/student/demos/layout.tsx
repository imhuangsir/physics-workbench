import type { ReactNode } from "react";

/** 电脑端两侧留白处的物理主题点缀；手机/窄屏(< xl)隐藏，不影响正文。 */
function Rail({ side }: { side: "left" | "right" }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed top-1/2 z-0 hidden w-40 -translate-y-1/2 select-none xl:block ${side === "left" ? "left-4" : "right-4"}`}
    >
      <div className="flex flex-col items-center gap-12 text-violet-500/20 dark:text-violet-300/15">
        {side === "left" ? (
          <>
            {/* 凸透镜会聚光线 */}
            <svg width="122" height="92" viewBox="0 0 122 92" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M61 8 Q73 46 61 84 Q49 46 61 8 Z" />
              <path d="M6 30 H61 M61 30 L114 46 M6 46 H61 M61 46 H114 M6 62 H61 M61 62 L114 46" />
              <circle cx="114" cy="46" r="2.4" fill="currentColor" />
            </svg>
            {/* 正弦波 */}
            <svg width="122" height="46" viewBox="0 0 122 46" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 23 Q19 1 34 23 Q49 45 64 23 Q79 1 94 23 Q109 45 122 23" />
            </svg>
            <span className="font-mono text-base tracking-wider">v = λf</span>
          </>
        ) : (
          <>
            {/* 三棱镜色散 */}
            <svg width="118" height="88" viewBox="0 0 118 88" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M60 12 L38 68 L82 68 Z" />
              <path d="M6 42 H50 M66 48 L112 32 M66 48 L112 44 M66 48 L112 56" />
            </svg>
            {/* 原子 */}
            <svg width="92" height="92" viewBox="0 0 92 92" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="46" cy="46" r="4" fill="currentColor" />
              <ellipse cx="46" cy="46" rx="40" ry="15" />
              <ellipse cx="46" cy="46" rx="40" ry="15" transform="rotate(60 46 46)" />
              <ellipse cx="46" cy="46" rx="40" ry="15" transform="rotate(120 46 46)" />
            </svg>
            <span className="font-mono text-base tracking-wider">ρ = m / V</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function DemosLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Rail side="left" />
      <Rail side="right" />
      {children}
    </>
  );
}
