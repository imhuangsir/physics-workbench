// 题库章节：内置人教版八上6章（常量），老师可自建章节。
// 完整顺序 = 自建章节(越新越前) → 内置6章；不匹配任何已知章节的题目归入"未分类"。
export const STANDARD_CHAPTERS = [
  "第1章 机械运动",
  "第2章 声现象",
  "第3章 物态变化",
  "第4章 光现象",
  "第5章 透镜及其应用",
  "第6章 质量与密度",
] as const;

export const UNCATEGORIZED = "未分类";

/** 组合完整章节顺序：自建章节(传入时已按越新越前) 在前，内置6章在后，去重。 */
export function orderedChapters(customNewestFirst: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of [...customNewestFirst, ...STANDARD_CHAPTERS]) {
    const n = c?.trim();
    if (n && !seen.has(n)) { seen.add(n); out.push(n); }
  }
  return out;
}

/** 把题目的章节字段归一到已知章节，否则归"未分类"。 */
export function bucketOf(chapter: string | null | undefined, known: Set<string>): string {
  const c = chapter?.trim();
  return c && known.has(c) ? c : UNCATEGORIZED;
}
