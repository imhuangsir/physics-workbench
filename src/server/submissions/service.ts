import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { submissions, answers, assignmentQuestions, assignmentClasses, questions } from "../../db/schema";
import { gradeAnswer, type GradeInput } from "../../lib/grading/objective";
import { appError } from "../../lib/http";

interface SubmitInput { durationSec: number; answers: { questionId: number; content: string | string[] }[]; }

export async function submitAssignment(db: DB, assignmentId: number, studentId: number, classId: number, input: SubmitInput) {
  // 越权校验：作业必须分配给该学生所在班级（规格 §6.4）
  const assigned = await db.select().from(assignmentClasses)
    .where(and(eq(assignmentClasses.assignmentId, assignmentId), eq(assignmentClasses.classId, classId))).get();
  if (!assigned) throw appError("forbidden", "无权提交该作业");

  // 幂等/防重：已存在且已提交 → conflict
  const existing = await db.select().from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId))).get();
  if (existing && existing.status !== "not_started") throw appError("conflict", "该作业已提交，不能重复提交");

  const aqs = await db.select().from(assignmentQuestions).where(eq(assignmentQuestions.assignmentId, assignmentId));
  if (aqs.length === 0) throw appError("not_found", "作业不存在或无题目");
  const qIds = aqs.map((x) => x.questionId);
  const qs = await db.select().from(questions).where(inArray(questions.id, qIds));
  const qMap = new Map(qs.map((q) => [q.id, q]));
  const scoreMap = new Map(aqs.map((x) => [x.questionId, x.score]));
  const answerMap = new Map(input.answers.map((a) => [a.questionId, a.content]));

  let objectiveScore = 0;
  let hasUngradedShort = false;
  const now = Math.floor(Date.now() / 1000);

  const subId = existing?.id ?? (await db.insert(submissions)
    .values({ assignmentId, studentId, status: "not_started", startedAt: now }).returning())[0].id;

  for (const aq of aqs) {
    const q = qMap.get(aq.questionId)!;
    const raw = answerMap.get(aq.questionId);
    const full = scoreMap.get(aq.questionId)!;
    const gi = toGradeInput(q, raw, full);
    const g = gradeAnswer(gi);
    if (q.type === "short") hasUngradedShort = true;
    else objectiveScore += g.score ?? 0;
    await db.insert(answers).values({
      submissionId: subId, questionId: q.id,
      contentJson: JSON.stringify(raw ?? null), isCorrect: g.isCorrect, score: g.score,
    });
  }

  const status = hasUngradedShort ? "submitted" : "graded";
  const [updated] = await db.update(submissions).set({
    status, submittedAt: now, durationSec: input.durationSec,
    objectiveScore, totalScore: objectiveScore, // 本轮总分=客观分
  }).where(eq(submissions.id, subId)).returning();
  return updated;
}

function toGradeInput(q: { type: string; answerJson: string | null }, raw: unknown, full: number): GradeInput {
  const answer = q.answerJson ? JSON.parse(q.answerJson) : null;
  switch (q.type) {
    case "single": return { type: "single", answer: String(answer ?? ""), content: String(raw ?? ""), full };
    case "multi":  return { type: "multi", answer: (answer as string[]) ?? [], content: Array.isArray(raw) ? raw as string[] : [], full };
    case "fill":   return { type: "fill", answer: (answer as string[]) ?? [], content: String(raw ?? ""), full };
    default:       return { type: "short", answer: null, content: String(raw ?? ""), full };
  }
}

/** 结果：客观对错 + 得分 + 解析；简答标记"待批改" */
export async function getResult(db: DB, assignmentId: number, studentId: number) {
  const sub = await db.select().from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId))).get();
  if (!sub) throw appError("not_found", "尚未提交");
  const rows = await db.select().from(answers).where(eq(answers.submissionId, sub.id));
  const qIds = rows.map((r) => r.questionId);
  const qs = qIds.length ? await db.select().from(questions).where(inArray(questions.id, qIds)) : [];
  const qMap = new Map(qs.map((q) => [q.id, q]));
  return {
    status: sub.status, objectiveScore: sub.objectiveScore, totalScore: sub.totalScore, durationSec: sub.durationSec,
    answers: rows.map((r) => {
      const q = qMap.get(r.questionId)!;
      const isShort = q.type === "short";
      return {
        questionId: r.questionId, type: q.type, stem: q.stem,
        content: JSON.parse(r.contentJson), isCorrect: r.isCorrect, score: r.score,
        answer: q.answerJson ? JSON.parse(q.answerJson) : null, // 结果页可看标准答案
        analysis: q.analysis,
        aiFeedback: r.aiFeedback, // ② 轮：简答 AI/人工评语
        pending: isShort && !r.gradedBy, // 简答未批改前标记"待批改"
      };
    }),
  };
}
