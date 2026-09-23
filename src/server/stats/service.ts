import { eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { assignmentClasses, students, submissions, answers, assignmentQuestions } from "../../db/schema";

export async function assignmentStats(db: DB, assignmentId: number) {
  // 应交人数 = 分配班级的学生总数
  const cls = await db.select({ classId: assignmentClasses.classId }).from(assignmentClasses)
    .where(eq(assignmentClasses.assignmentId, assignmentId));
  const classIds = cls.map((x) => x.classId);
  const roster = classIds.length ? await db.select().from(students).where(inArray(students.classId, classIds)) : [];
  const assigned = roster.length;

  const subs = await db.select().from(submissions).where(eq(submissions.assignmentId, assignmentId));
  const done = subs.filter((s) => s.status !== "not_started");
  const submitted = done.length;
  const avgDurationSec = submitted ? Math.round(done.reduce((a, s) => a + (s.durationSec ?? 0), 0) / submitted) : 0;
  const avgTotalScore = submitted ? +(done.reduce((a, s) => a + (s.totalScore ?? 0), 0) / submitted).toFixed(2) : 0;

  // 每题正确率：在已提交答卷里，isCorrect=1 的占比（简答 isCorrect=NULL 不计入分母）
  const aqs = await db.select().from(assignmentQuestions).where(eq(assignmentQuestions.assignmentId, assignmentId));
  const subIds = done.map((s) => s.id);
  const ans = subIds.length ? await db.select().from(answers).where(inArray(answers.submissionId, subIds)) : [];
  const perQuestion = aqs.map((aq) => {
    const rows = ans.filter((a) => a.questionId === aq.questionId && a.isCorrect !== null);
    const correct = rows.filter((a) => a.isCorrect === 1).length;
    return { questionId: aq.questionId, orderNo: aq.orderNo, answered: rows.length, correctRate: rows.length ? correct / rows.length : 0 };
  }).sort((a, b) => a.orderNo - b.orderNo);

  return { assigned, submitted, progress: assigned ? submitted / assigned : 0, avgDurationSec, avgTotalScore, perQuestion };
}
