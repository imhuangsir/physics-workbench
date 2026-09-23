import { desc, eq, or, isNull, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { announcements, classes } from "../../db/schema";
import { appError } from "../../lib/http";

const now = () => Math.floor(Date.now() / 1000);

/** 老师：全部公告（新→旧），带班级名（classId 为空显示"全体"）。 */
export async function listAllAnnouncements(db: DB) {
  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  const clsIds = [...new Set(rows.map((r) => r.classId).filter((x): x is number => x != null))];
  const cls = clsIds.length ? await db.select().from(classes).where(inArray(classes.id, clsIds)) : [];
  const nameMap = new Map(cls.map((c) => [c.id, c.name]));
  return rows.map((r) => ({
    id: r.id, title: r.title, body: r.body, classId: r.classId,
    className: r.classId == null ? "全体" : nameMap.get(r.classId) ?? "?", createdAt: r.createdAt,
  }));
}

export async function createAnnouncement(db: DB, input: { title: string; body?: string; classId?: number | null }) {
  const title = (input.title ?? "").trim();
  if (!title) throw appError("validation_error", "请填写公告标题");
  const [row] = await db.insert(announcements).values({
    title, body: (input.body ?? "").trim(), classId: input.classId ?? null, createdAt: now(),
  }).returning();
  return row;
}

export async function deleteAnnouncement(db: DB, id: number) {
  await db.delete(announcements).where(eq(announcements.id, id));
  return { ok: true };
}

/** 学生：本班 + 全体公告（新→旧）。 */
export async function listStudentAnnouncements(db: DB, classId: number) {
  const rows = await db.select().from(announcements)
    .where(or(isNull(announcements.classId), eq(announcements.classId, classId)))
    .orderBy(desc(announcements.createdAt));
  return rows.map((r) => ({ id: r.id, title: r.title, body: r.body, createdAt: r.createdAt }));
}
