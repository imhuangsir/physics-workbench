import { and, eq } from "drizzle-orm";
import type { DB } from "../../db/client";
import { students, loginLogs } from "../../db/schema";
import { signToken } from "../../lib/auth/token";
import { appError } from "../../lib/http";

/** 常量时间比较，避免时序侧信道 */
function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}

export async function studentLogin(
  db: DB,
  input: { classId: number; name: string },
  secret: string,
  meta: { ip: string | null; ua: string | null } | null,
) {
  const name = input.name.trim();
  if (!name) throw appError("validation_error", "请输入姓名");
  const matches = await db.select().from(students)
    .where(and(eq(students.classId, input.classId), eq(students.name, name)));
  if (matches.length === 0) throw appError("student_not_found", "未找到该同学，请核对姓名或联系老师");
  if (matches.length > 1) throw appError("duplicate_name", "该班级有多个同名同学，请联系老师处理");
  const s = matches[0];
  if (s.status === "disabled") throw appError("forbidden", "登录已被老师暂停");
  await db.insert(loginLogs).values({ studentId: s.id, ip: meta?.ip ?? null, ua: meta?.ua ?? null });
  const token = await signToken({ sub: s.id, role: "student", classId: s.classId, lv: s.loginVersion }, secret);
  return { token, student: { id: s.id, name: s.name, classId: s.classId } };
}

export async function teacherLogin(input: string, adminPassword: string, secret: string) {
  if (!timingSafeEqual(input, adminPassword)) throw appError("unauthorized", "密码错误");
  const token = await signToken({ role: "teacher" }, secret);
  return { token };
}
