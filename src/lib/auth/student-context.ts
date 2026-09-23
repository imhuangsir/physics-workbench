import { eq } from "drizzle-orm";
import type { DB } from "../../db/client";
import { students } from "../../db/schema";
import { appError } from "../http";

/**
 * 学生路由统一约定：requireStudent 只返回 studentId（勿改其签名）。
 * 学生所在 classId 一律从库查询获得，不从 token claims 取，避免与库不一致。
 */
export async function studentClassId(db: DB, studentId: number): Promise<number> {
  const row = await db.select({ classId: students.classId }).from(students).where(eq(students.id, studentId)).get();
  if (!row) throw appError("unauthorized", "登录状态无效，请重新登录");
  return row.classId;
}
