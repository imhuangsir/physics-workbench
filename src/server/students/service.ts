import { and, eq, sql } from "drizzle-orm";
import type { DB } from "../../db/client";
import { classes, students } from "../../db/schema";
import { appError } from "../../lib/http";

export async function createClass(db: DB, name: string) {
  const n = name.trim();
  if (!n) throw appError("validation_error", "班级名不能为空");
  const [c] = await db.insert(classes).values({ name: n }).returning();
  return c;
}

export async function listClassesWithCount(db: DB) {
  return db.select({
    id: classes.id, name: classes.name,
    count: sql<number>`count(${students.id})`,
  }).from(classes).leftJoin(students, eq(students.classId, classes.id)).groupBy(classes.id);
}

/** 导入名单：dedup_label 默认 ''，同名同 label 冲突则跳过并计入 duplicates */
export async function importStudents(db: DB, classId: number, names: string[]) {
  const duplicates: string[] = [];
  let inserted = 0;
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const exists = await db.select().from(students)
      .where(and(eq(students.classId, classId), eq(students.name, name), eq(students.dedupLabel, ""))).get();
    if (exists) { duplicates.push(name); continue; }
    await db.insert(students).values({ classId, name });
    inserted++;
  }
  return { inserted, duplicates };
}

export async function listStudents(db: DB, classId: number) {
  return db.select().from(students).where(eq(students.classId, classId));
}

export async function updateStudent(db: DB, id: number, patch: { name?: string; dedupLabel?: string; status?: "active" | "disabled" }) {
  const [row] = await db.update(students).set(patch).where(eq(students.id, id)).returning();
  if (!row) throw appError("not_found", "学生不存在");
  return row;
}

export async function revokeStudent(db: DB, id: number) {
  const [row] = await db.update(students)
    .set({ loginVersion: sql`${students.loginVersion} + 1` }).where(eq(students.id, id)).returning();
  if (!row) throw appError("not_found", "学生不存在");
  return row;
}
