import { desc, eq } from "drizzle-orm";
import type { DB } from "../../db/client";
import { chapters } from "../../db/schema";
import { appError } from "../../lib/http";

/** 老师自建章节，按创建时间倒序（越新越前）。 */
export async function listChapters(db: DB) {
  return db.select().from(chapters).orderBy(desc(chapters.createdAt));
}

/** 新建章节；已存在同名则直接返回，避免重复。 */
export async function createChapter(db: DB, name: string) {
  const n = (name ?? "").trim();
  if (!n) throw appError("validation_error", "章节名不能为空");
  if (n.length > 40) throw appError("validation_error", "章节名过长");
  const existing = await db.select().from(chapters).where(eq(chapters.name, n));
  if (existing.length) return existing[0];
  const [c] = await db.insert(chapters).values({ name: n }).returning();
  return c;
}
