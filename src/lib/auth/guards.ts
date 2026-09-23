import { eq } from "drizzle-orm";
import type { DB } from "../../db/client";
import { students } from "../../db/schema";
import { verifyToken, type StudentClaims, type TeacherClaims } from "./token";
import { appError } from "../http";

function bearer(req: Request): string {
  const h = req.headers.get("Authorization") ?? "";
  const m = h.match(/^Bearer (.+)$/);
  if (!m) throw appError("unauthorized", "未登录或登录已过期");
  return m[1];
}

/** 校验学生 token：签名 + login_version + status，返回 studentId */
export async function requireStudent(req: Request, deps: { db: DB; secret: string }): Promise<number> {
  const token = bearer(req);
  let claims: StudentClaims;
  try {
    claims = await verifyToken<StudentClaims>(token, deps.secret);
  } catch {
    throw appError("unauthorized", "登录状态无效，请重新登录");
  }
  if (claims.role !== "student") throw appError("forbidden", "无权访问");
  const row = await deps.db.select().from(students).where(eq(students.id, claims.sub)).get();
  if (!row) throw appError("unauthorized", "登录状态无效，请重新登录");
  if (row.loginVersion !== claims.lv) throw appError("session_revoked", "登录态已被清除，请重新登录");
  if (row.status === "disabled") throw appError("forbidden", "登录已被老师暂停");
  return row.id;
}

/** 校验老师 token：签名 + role */
export async function requireTeacher(req: Request, secret: string): Promise<void> {
  const token = bearer(req);
  let claims: TeacherClaims;
  try {
    claims = await verifyToken<TeacherClaims>(token, secret);
  } catch {
    throw appError("unauthorized", "登录状态无效，请重新登录");
  }
  if (claims.role !== "teacher") throw appError("forbidden", "无权访问");
}
