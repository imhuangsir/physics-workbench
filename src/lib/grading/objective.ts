export type GradeInput =
  | { type: "single"; answer: string; content: string; full: number }
  | { type: "multi"; answer: string[]; content: string[]; full: number }
  | { type: "fill"; answer: string[]; content: string; full: number }
  | { type: "short"; answer: null; content: string; full: number };

export type GradeResult = { isCorrect: number | null; score: number | null };

function normalize(s: string): string {
  return s
    .trim()
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // 全角→半角
    .replace(/　/g, " ") // 全角空格
    .replace(/\s+/g, "")
    .toLowerCase();
}

export function gradeAnswer(input: GradeInput): GradeResult {
  const { type, full } = input;
  if (type === "single") {
    const ok = input.content === input.answer;
    return { isCorrect: ok ? 1 : 0, score: ok ? full : 0 };
  }
  if (type === "multi") {
    const ans = new Set(input.answer);
    const got = input.content;
    if (got.length === 0) return { isCorrect: 0, score: 0 };
    const hasWrong = got.some((k) => !ans.has(k));
    if (hasWrong) return { isCorrect: 0, score: 0 };
    const uniqGot = new Set(got);
    if (uniqGot.size === ans.size) return { isCorrect: 1, score: full }; // 无错选且数量齐 = 全对
    return { isCorrect: 0, score: full * 0.5 }; // 部分正确且无错选 = 半对
  }
  if (type === "fill") {
    const norm = normalize(input.content);
    const ok = input.answer.some((a) => normalize(a) === norm);
    return { isCorrect: ok ? 1 : 0, score: ok ? full : 0 };
  }
  // short：本轮不判分
  return { isCorrect: null, score: null };
}
