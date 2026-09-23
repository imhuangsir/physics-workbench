import { and, eq, like, desc } from "drizzle-orm";
import type { DB } from "../../db/client";
import { questions } from "../../db/schema";
import { appError } from "../../lib/http";
import { normalizeQuestion, type QuestionInput } from "./validate";

export async function createQuestion(db: DB, input: QuestionInput) {
  const row = normalizeQuestion(input);
  const [q] = await db.insert(questions).values(row).returning();
  return q;
}

export async function listQuestions(db: DB, filter: { chapter?: string; type?: string; tag?: string } = {}) {
  const conds = [];
  if (filter.chapter) conds.push(eq(questions.chapter, filter.chapter));
  if (filter.type) conds.push(eq(questions.type, filter.type as QuestionInput["type"]));
  if (filter.tag) conds.push(like(questions.knowledgeTagsJson, `%${filter.tag}%`));
  return db.select().from(questions)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(questions.createdAt));
}

export async function updateQuestion(db: DB, id: number, input: QuestionInput) {
  const row = normalizeQuestion(input);
  const [q] = await db.update(questions).set(row).where(eq(questions.id, id)).returning();
  if (!q) throw appError("not_found", "题目不存在");
  return q;
}

export async function deleteQuestion(db: DB, id: number) {
  const [q] = await db.delete(questions).where(eq(questions.id, id)).returning();
  if (!q) throw appError("not_found", "题目不存在");
  return { id };
}
