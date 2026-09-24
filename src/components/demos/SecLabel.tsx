import type { ReactNode } from "react";

/** 演示章节页的分节小标题（第 N 节 · 标题）。 */
export function SecLabel({ children }: { children: ReactNode }) {
  return <div className="pt-1 text-sm font-bold text-foreground/70">{children}</div>;
}
