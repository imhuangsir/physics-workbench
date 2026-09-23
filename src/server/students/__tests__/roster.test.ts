import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../../../db/client";
import { classes, students } from "../../../db/schema";
import { importStudents, revokeStudent } from "../service";
import { signToken } from "../../../lib/auth/token";
import { requireStudent } from "../../../lib/auth/guards";
import { eq } from "drizzle-orm";

describe("importStudents", () => {
  it("批量导入并报告重复", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "1班" }).returning();
    const r1 = await importStudents(db, c.id, ["张三", "李四", "张三"]);
    expect(r1.inserted).toBe(2);        // 第二个"张三"与首个同名同 label 冲突
    expect(r1.duplicates).toContain("张三");
    const rows = await db.select().from(students).where(eq(students.classId, c.id));
    expect(rows).toHaveLength(2);
  });
});

describe("revokeStudent", () => {
  it("login_version 自增", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "2班" }).returning();
    const [s] = await db.insert(students).values({ classId: c.id, name: "钱七" }).returning();
    await revokeStudent(db, s.id);
    const after = await db.select().from(students).where(eq(students.id, s.id)).get();
    expect(after!.loginVersion).toBe(1);
  });

  it("清除登录态后旧 token 被守卫拒（session_revoked）", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "3班" }).returning();
    const [s] = await db.insert(students).values({ classId: c.id, name: "赵八" }).returning();
    const oldToken = await signToken({ sub: s.id, role: "student", classId: c.id, lv: s.loginVersion }, env.AUTH_SECRET);
    await revokeStudent(db, s.id);
    const req = new Request("http://x", { headers: { Authorization: `Bearer ${oldToken}` } });
    await expect(requireStudent(req, { db, secret: env.AUTH_SECRET }))
      .rejects.toMatchObject({ code: "session_revoked" });
  });
});
