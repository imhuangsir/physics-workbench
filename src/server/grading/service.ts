import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { submissions, answers, assignmentQuestions, assignments, questions, students } from "../../db/schema";
import { aiConfig } from "../../lib/ai/provider";
import type { AppEnv } from "../../lib/env";
import { gradeShortWithAi } from "./ai";
import { appError } from "../../lib/http";

const now = () => Math.floor(Date.now() / 1000);
function safeStr(contentJson: string): string {
  try {
    const v = JSON.parse(contentJson);
    return typeof v === "string" ? v : v == null ? "" : String(v);
  } catch { return contentJson; }
}

/** 重算某份提交的总分与状态：所有简答都批完则 graded，否则仍 submitted。 */
async function recompute(db: DB, submissionId: number) {
  const rows = await db.select().from(answers).where(eq(answers.submissionId, submissionId));
  const qs = rows.length ? await db.select().from(questions).where(inArray(questions.id, rows.map((r) => r.questionId))) : [];
  const typeMap = new Map(qs.map((q) => [q.id, q.type]));
  const total = rows.reduce((s, a) => s + (a.score ?? 0), 0);
  const pending = rows.some((a) => typeMap.get(a.questionId) === "short" && !a.gradedBy);
  await db.update(submissions).set({ totalScore: total, status: pending ? "submitted" : "graded" }).where(eq(submissions.id, submissionId));
}

/** 老师批改页数据：按简答题聚合所有已提交学生的作答与当前批改状态。 */
export async function listAssignmentShorts(db: DB, assignmentId: number) {
  const a = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).get();
  if (!a) throw appError("not_found", "作业不存在");
  const aqs = await db.select().from(assignmentQuestions).where(eq(assignmentQuestions.assignmentId, assignmentId));
  const qs = aqs.length ? await db.select().from(questions).where(inArray(questions.id, aqs.map((x) => x.questionId))) : [];
  const shortQs = qs.filter((q) => q.type === "short");
  const scoreMap = new Map(aqs.map((x) => [x.questionId, x.score]));
  const orderMap = new Map(aqs.map((x) => [x.questionId, x.orderNo]));

  const subs = await db.select().from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), inArray(submissions.status, ["submitted", "graded"])));
  const subIds = subs.map((s) => s.id);
  const nameMap = new Map<number, string>();
  if (subs.length) {
    const sts = await db.select().from(students).where(inArray(students.id, subs.map((s) => s.studentId)));
    for (const st of sts) nameMap.set(st.id, st.dedupLabel ? `${st.name}(${st.dedupLabel})` : st.name);
  }
  const subStudent = new Map(subs.map((s) => [s.id, s.studentId]));
  const ans = subIds.length ? await db.select().from(answers).where(inArray(answers.submissionId, subIds)) : [];

  return {
    assignmentId, title: a.title,
    questions: shortQs.map((q) => ({
      questionId: q.id, orderNo: orderMap.get(q.id) ?? 0, stem: q.stem,
      reference: q.analysis, fullScore: scoreMap.get(q.id) ?? 0,
      items: ans.filter((x) => x.questionId === q.id).map((x) => ({
        answerId: x.id, submissionId: x.submissionId,
        studentName: nameMap.get(subStudent.get(x.submissionId) ?? -1) ?? "?",
        content: safeStr(x.contentJson), score: x.score, isCorrect: x.isCorrect,
        aiFeedback: x.aiFeedback, gradedBy: x.gradedBy,
      })),
    })).sort((x, y) => x.orderNo - y.orderNo),
  };
}

/** 用 AI 批改该作业所有"尚未批改"的简答作答（已批过的 ai/manual 跳过，可重复触发只补漏）。 */
export async function gradeAssignmentShorts(db: DB, env: AppEnv, assignmentId: number): Promise<{ graded: number; failed: number }> {
  const cfg = aiConfig(env);
  const aqs = await db.select().from(assignmentQuestions).where(eq(assignmentQuestions.assignmentId, assignmentId));
  const qs = aqs.length ? await db.select().from(questions).where(inArray(questions.id, aqs.map((x) => x.questionId))) : [];
  const shortMap = new Map(qs.filter((q) => q.type === "short").map((q) => [q.id, q]));
  const scoreMap = new Map(aqs.map((x) => [x.questionId, x.score]));
  if (shortMap.size === 0) return { graded: 0, failed: 0 };

  const subs = await db.select().from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), inArray(submissions.status, ["submitted", "graded"])));
  let graded = 0, failed = 0;
  for (const sub of subs) {
    const rows = await db.select().from(answers).where(eq(answers.submissionId, sub.id));
    for (const x of rows) {
      const q = shortMap.get(x.questionId);
      if (!q || x.gradedBy) continue;
      const g = await gradeShortWithAi(cfg, {
        stem: q.stem, reference: q.analysis, fullScore: scoreMap.get(x.questionId) ?? 0, studentAnswer: safeStr(x.contentJson),
      });
      await db.update(answers).set({ score: g.score, isCorrect: g.isCorrect, aiFeedback: g.feedback, gradedBy: "ai", gradedAt: now() })
        .where(eq(answers.id, x.id));
      if (g.needsReview) failed++; else graded++;
    }
    await recompute(db, sub.id);
  }
  return { graded, failed };
}

/** 老师人工批改/覆盖单条简答分数与评语。 */
export async function manualGradeAnswer(db: DB, answerId: number, score: number, feedback: string | null): Promise<void> {
  const a = await db.select().from(answers).where(eq(answers.id, answerId)).get();
  if (!a) throw appError("not_found", "作答不存在");
  const q = await db.select().from(questions).where(eq(questions.id, a.questionId)).get();
  if (!q || q.type !== "short") throw appError("validation_error", "仅简答题支持人工批改");
  const s = Math.max(0, Number(score) || 0);
  await db.update(answers).set({ score: s, isCorrect: s > 0 ? 1 : 0, aiFeedback: feedback ?? a.aiFeedback, gradedBy: "manual", gradedAt: now() })
    .where(eq(answers.id, answerId));
  await recompute(db, a.submissionId);
}
