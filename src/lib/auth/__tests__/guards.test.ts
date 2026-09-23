import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { classes, students } from "../../../db/schema";
import { signToken } from "../token";
import { requireStudent, requireTeacher } from "../guards";
import { AppError } from "../../http";

function req(token?: string) {
  return new Request("http://x", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}
const deps = () => ({ db: getDb(env.DB), secret: env.AUTH_SECRET });

describe("guards", () => {
  it("无 token → unauthorized", async () => {
    await expect(requireStudent(req(), deps())).rejects.toMatchObject({ code: "unauthorized" });
  });
  it("学生 token 且 lv 匹配 → 返回 studentId", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "1班" }).returning();
    const [s] = await db.insert(students).values({ classId: c.id, name: "李四" }).returning();
    const t = await signToken({ sub: s.id, role: "student", classId: c.id, lv: 0 }, env.AUTH_SECRET);
    await expect(requireStudent(req(t), deps())).resolves.toBe(s.id);
  });
  it("lv 落后于库 → session_revoked", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "2班" }).returning();
    const [s] = await db.insert(students).values({ classId: c.id, name: "王五" }).returning();
    const t = await signToken({ sub: s.id, role: "student", classId: c.id, lv: 0 }, env.AUTH_SECRET);
    await db.update(students).set({ loginVersion: 1 }).where(eq(students.id, s.id));
    await expect(requireStudent(req(t), deps())).rejects.toMatchObject({ code: "session_revoked" });
  });
  it("学生 token 调 requireTeacher → forbidden", async () => {
    const t = await signToken({ sub: 1, role: "student", classId: 1, lv: 0 }, env.AUTH_SECRET);
    await expect(requireTeacher(req(t), env.AUTH_SECRET)).rejects.toBeInstanceOf(AppError);
  });
});
