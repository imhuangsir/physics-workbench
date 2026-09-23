import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { assignments, assignmentClasses, assignmentQuestions, questions, submissions } from "../../db/schema";
import { appError } from "../../lib/http";

export interface CreateAssignmentInput {
  title: string; dueAt: number | null; classIds: number[];
  questions: { questionId: number; orderNo: number; score: number }[];
}

export async function createAssignment(db: DB, input: CreateAssignmentInput) {
  if (!input.title?.trim()) throw appError("validation_error", "作业标题不能为空");
  if (!input.classIds?.length) throw appError("validation_error", "请至少分配一个班级");
  if (!input.questions?.length) throw appError("validation_error", "作业至少包含一道题");
  const [a] = await db.insert(assignments).values({ title: input.title.trim(), dueAt: input.dueAt }).returning();
  await db.insert(assignmentClasses).values(input.classIds.map((classId) => ({ assignmentId: a.id, classId })));
  await db.insert(assignmentQuestions).values(input.questions.map((q) => ({ assignmentId: a.id, ...q })));
  return a;
}

export async function listTeacherAssignments(db: DB) {
  return db.select().from(assignments).orderBy(assignments.createdAt);
}

/** 学生：分配到本班的作业 + 本人提交状态 */
export async function listStudentAssignments(db: DB, studentId: number, classId: number) {
  const rows = await db.select({ id: assignments.id, title: assignments.title, dueAt: assignments.dueAt })
    .from(assignments)
    .innerJoin(assignmentClasses, eq(assignmentClasses.assignmentId, assignments.id))
    .where(eq(assignmentClasses.classId, classId));
  const subs = await db.select().from(submissions).where(eq(submissions.studentId, studentId));
  const byA = new Map(subs.map((s) => [s.assignmentId, s]));
  return rows.map((r) => ({ ...r, status: byA.get(r.id)?.status ?? "not_started" }));
}

/** 学生：作业详情。校验该作业确实分配给学生所在班级；题目不下发 answerJson */
export async function getStudentAssignmentDetail(db: DB, assignmentId: number, studentId: number, classId: number) {
  const assigned = await db.select().from(assignmentClasses)
    .where(and(eq(assignmentClasses.assignmentId, assignmentId), eq(assignmentClasses.classId, classId))).get();
  if (!assigned) throw appError("forbidden", "无权访问该作业");
  const a = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).get();
  if (!a) throw appError("not_found", "作业不存在");
  const aqs = await db.select().from(assignmentQuestions)
    .where(eq(assignmentQuestions.assignmentId, assignmentId)).orderBy(assignmentQuestions.orderNo);
  const qIds = aqs.map((x) => x.questionId);
  const qs = qIds.length ? await db.select().from(questions).where(inArray(questions.id, qIds)) : [];
  const qMap = new Map(qs.map((q) => [q.id, q]));
  const questionsOut = aqs.map((aq) => {
    const q = qMap.get(aq.questionId)!;
    return {
      questionId: q.id, type: q.type, stem: q.stem,
      optionsJson: q.optionsJson, // 选项要发；答案/解析不发
      orderNo: aq.orderNo, score: aq.score,
    };
  });
  return { id: a.id, title: a.title, dueAt: a.dueAt, questions: questionsOut };
}

/** 学生开始作业：幂等创建 submission 并记 started_at */
export async function startAssignment(db: DB, assignmentId: number, studentId: number, classId: number) {
  await getStudentAssignmentDetail(db, assignmentId, studentId, classId); // 复用越权校验
  const existing = await db.select().from(submissions)
    .where(and(eq(submissions.assignmentId, assignmentId), eq(submissions.studentId, studentId))).get();
  if (existing) return existing;
  const now = Math.floor(Date.now() / 1000);
  const [s] = await db.insert(submissions)
    .values({ assignmentId, studentId, status: "not_started", startedAt: now }).returning();
  return s;
}
