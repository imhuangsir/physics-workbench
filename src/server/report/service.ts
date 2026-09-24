import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { submissions, answers, questions } from "../../db/schema";

function safeTags(json: string | null): string[] {
  if (!json) return [];
  try { const v = JSON.parse(json); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : []; } catch { return []; }
}

export interface GroupStat { label: string; total: number; correct: number; rate: number }

/** 学生学习报告：跨全部已提交答卷，按章节 / 知识点统计正确率，并挑出薄弱项。 */
export async function studentReport(db: DB, studentId: number) {
  const subs = await db.select().from(submissions)
    .where(and(eq(submissions.studentId, studentId), inArray(submissions.status, ["submitted", "graded"])));
  const empty = { assignmentsDone: 0, total: 0, correct: 0, accuracy: 0, byChapter: [] as GroupStat[], byTag: [] as GroupStat[], weak: [] as GroupStat[] };
  if (subs.length === 0) return empty;

  const subIds = subs.map((s) => s.id);
  const graded = (await db.select().from(answers).where(inArray(answers.submissionId, subIds))).filter((a) => a.isCorrect !== null);
  if (graded.length === 0) return { ...empty, assignmentsDone: subs.length };

  const qIds = [...new Set(graded.map((a) => a.questionId))];
  const qs = await db.select().from(questions).where(inArray(questions.id, qIds));
  const qMap = new Map(qs.map((q) => [q.id, q]));

  const chapterAgg = new Map<string, { total: number; correct: number }>();
  const tagAgg = new Map<string, { total: number; correct: number }>();
  const bump = (m: Map<string, { total: number; correct: number }>, key: string, ok: boolean) => {
    const g = m.get(key) ?? { total: 0, correct: 0 };
    g.total++; if (ok) g.correct++; m.set(key, g);
  };

  for (const a of graded) {
    const q = qMap.get(a.questionId); if (!q) continue;
    const ok = a.isCorrect === 1;
    bump(chapterAgg, q.chapter?.trim() || "未分类", ok);
    for (const t of safeTags(q.knowledgeTagsJson)) bump(tagAgg, t, ok);
  }

  const toStats = (m: Map<string, { total: number; correct: number }>): GroupStat[] =>
    [...m].map(([label, v]) => ({ label, total: v.total, correct: v.correct, rate: v.total ? v.correct / v.total : 0 }))
      .sort((a, b) => b.total - a.total);

  const byChapter = toStats(chapterAgg);
  const byTag = toStats(tagAgg);
  const weak = [...byChapter, ...byTag]
    .filter((g) => g.total >= 2 && g.rate < 0.6)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 6);

  const total = graded.length;
  const correct = graded.filter((a) => a.isCorrect === 1).length;
  return { assignmentsDone: subs.length, total, correct, accuracy: total ? correct / total : 0, byChapter, byTag, weak };
}
