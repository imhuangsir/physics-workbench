import * as React from "react";
import { cn } from "@/lib/utils";

export type Tone = "violet" | "blue" | "rose" | "emerald" | "amber";

const SOFT: Record<Tone, string> = {
  violet: "soft-violet", blue: "soft-blue", rose: "soft-rose",
  emerald: "soft-emerald", amber: "soft-amber",
};
const FILL: Record<Tone, string> = {
  violet: "fill-violet", blue: "fill-blue", rose: "fill-rose",
  emerald: "fill-emerald", amber: "fill-amber",
};

/** 小标题（eyebrow）*/
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("eyebrow mb-3 block", className)}>{children}</span>;
}

/** 大号数字统计砖（柔和底色，随主题翻）*/
export function StatTile({ value, label, tone = "violet", className }: {
  value: React.ReactNode; label: React.ReactNode; tone?: Tone; className?: string;
}) {
  return (
    <div className={cn("rounded-2xl p-4 shadow-soft", SOFT[tone], className)}>
      <div className="num text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</div>
      <div className="mt-0.5 text-xs font-medium opacity-90">{label}</div>
    </div>
  );
}

/** 彩色进度条 */
export function ProgressBar({ value, tone = "violet", className }: {
  value: number; tone?: Tone; className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("h-2.5 overflow-hidden rounded-full border border-border bg-secondary", className)}>
      <div className={cn("h-full rounded-full transition-all", FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
