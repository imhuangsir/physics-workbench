import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { submissions, assignmentQuestions } from "../../db/schema";
import { appError } from "../../lib/http";

const BINS = 5;

/**
 * 学生视角的班级成绩分布 + 自己的排名（隐私安全：只返回聚合值与本人数据，不含他人姓名/分数明细）。
 * 仅当本人已提交时可见。
 */
export async function studentRank(db: DB, assignmentId: number, studentId: number) {
  const mine = await db.select().from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId))).get();
  if (!mine || mine.status === "not_started") throw appError("not_found", "尚未提交，暂无排名");

  const aqs = await db.select().from(assignmentQuestions).where(eq(assignmentQuestions.assignmentId, assignmentId));
  const fullScore = aqs.reduce((s, q) => s + q.score, 0);

  const done = await db.select().from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), inArray(submissions.status, ["submitted", "graded"])));
  const scores = done.map((s) => s.totalScore ?? 0);
  const total = scores.length;
  const myScore = mine.totalScore ?? 0;

  const rank = 1 + scores.filter((s) => s > myScore).length;
  const beat = scores.filter((s) => s < myScore).length;
  const average = total ? +(scores.reduce((a, b) => a + b, 0) / total).toFixed(1) : 0;
  const max = total ? Math.max(...scores) : 0;

  const step = fullScore > 0 ? fullScore / BINS : 1;
  const buckets = Array.from({ length: BINS }, (_, i) => {
    const lo = step * i, hi = i === BINS - 1 ? fullScore + 0.001 : step * (i + 1);
    const count = scores.filter((s) => s >= lo && s < hi).length;
    const mineHere = myScore >= lo && myScore < hi;
    return { label: `${Math.round(lo)}~${Math.round(step * (i + 1))}`, count, mine: mineHere };
  });

  return { myScore, rank, total, average, max, fullScore, beatPercent: total > 1 ? Math.round((beat / total) * 100) : 100, buckets };
}
