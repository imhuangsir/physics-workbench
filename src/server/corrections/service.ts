import { and, eq, inArray, desc } from "drizzle-orm";
import type { DB } from "../../db/client";
import { submissions, answers, questions, assignments, corrections } from "../../db/schema";
import { appError } from "../../lib/http";

const now = () => Math.floor(Date.now() / 1000);
function parse<T>(json: string | null): T | null {
  if (json == null) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}

/** 学生错题本：所有已提交答卷里判错(isCorrect=0)的题，含题目详情、你的作答、标准答案、解析与已提交的订正。 */
export async function listWrongQuestions(db: DB, studentId: number) {
  const subs = await db.select().from(submissions)
    .where(and(eq(submissions.studentId, studentId), inArray(submissions.status, ["submitted", "graded"])));
  if (subs.length === 0) return [];
  const subIds = subs.map((s) => s.id);
  const asgMap = new Map(subs.map((s) => [s.id, s.assignmentId]));

  const wrong = (await db.select().from(answers).where(inArray(answers.submissionId, subIds)))
    .filter((a) => a.isCorrect === 0);
  if (wrong.length === 0) return [];

  const qIds = [...new Set(wrong.map((a) => a.questionId))];
  const qs = await db.select().from(questions).where(inArray(questions.id, qIds));
  const qMap = new Map(qs.map((q) => [q.id, q]));

  const asgIds = [...new Set(subs.map((s) => s.assignmentId))];
  const asgs = asgIds.length ? await db.select().from(assignments).where(inArray(assignments.id, asgIds)) : [];
  const titleMap = new Map(asgs.map((a) => [a.id, a.title]));

  const corr = await db.select().from(corrections)
    .where(and(eq(corrections.studentId, studentId), inArray(corrections.questionId, qIds)))
    .orderBy(desc(corrections.createdAt));

  return wrong.map((a) => {
    const q = qMap.get(a.questionId);
    const assignmentId = asgMap.get(a.submissionId) ?? null;
    return {
      questionId: a.questionId,
      assignmentId,
      assignmentTitle: assignmentId != null ? titleMap.get(assignmentId) ?? "" : "",
      type: q?.type ?? "", stem: q?.stem ?? "",
      optionsJson: q?.optionsJson ?? null,
      yourAnswer: parse<string | string[]>(a.contentJson),
      correctAnswer: q?.answerJson ? parse<string | string[]>(q.answerJson) : null,
      analysis: q?.analysis ?? null,
      score: a.score,
      corrections: corr.filter((c) => c.questionId === a.questionId)
        .map((c) => ({ id: c.id, text: c.text, imageKey: c.imageKey, createdAt: c.createdAt })),
    };
  });
}

/** 提交一条订正（文字 + 可选图片 key）。 */
export async function addCorrection(
  db: DB, studentId: number,
  input: { questionId: number; assignmentId?: number | null; text: string; imageKey?: string | null },
) {
  const text = (input.text ?? "").trim();
  if (!text && !input.imageKey) throw appError("validation_error", "请填写订正内容或上传图片");
  const q = await db.select().from(questions).where(eq(questions.id, input.questionId)).get();
  if (!q) throw appError("not_found", "题目不存在");
  const [row] = await db.insert(corrections).values({
    studentId, questionId: input.questionId, assignmentId: input.assignmentId ?? null,
    text, imageKey: input.imageKey ?? null, createdAt: now(),
  }).returning();
  return row;
}
