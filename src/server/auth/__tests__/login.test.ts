import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db/client";
import { classes, students } from "../../../db/schema";
import { studentLogin, teacherLogin } from "../service";

async function seed() {
  const db = getDb(env.DB);
  const [c] = await db.insert(classes).values({ name: "八(1)班" }).returning();
  await db.insert(students).values([
    { classId: c.id, name: "张三", dedupLabel: "" },
    { classId: c.id, name: "王二", dedupLabel: "1" },
    { classId: c.id, name: "王二", dedupLabel: "2" },
  ]);
  return { db, classId: c.id };
}

describe("studentLogin", () => {
  it("0 命中 → student_not_found", async () => {
    const { db, classId } = await seed();
    await expect(studentLogin(db, { classId, name: "不存在" }, env.AUTH_SECRET, null))
      .rejects.toMatchObject({ code: "student_not_found" });
  });
  it(">1 同名命中 → duplicate_name", async () => {
    const { db, classId } = await seed();
    await expect(studentLogin(db, { classId, name: "王二" }, env.AUTH_SECRET, null))
      .rejects.toMatchObject({ code: "duplicate_name", message: "该班级有多个同名同学，请联系老师处理" });
  });
  it("1 命中 active → 返回 token 且写 login_logs", async () => {
    const { db, classId } = await seed();
    const r = await studentLogin(db, { classId, name: "张三" }, env.AUTH_SECRET, { ip: "1.1.1.1", ua: "test" });
    expect(r.token).toBeTruthy();
    expect(r.student.name).toBe("张三");
    const logs = await db.query.loginLogs.findMany();
    expect(logs).toHaveLength(1);
  });
  it("disabled → forbidden", async () => {
    const { db, classId } = await seed();
    await db.update(students).set({ status: "disabled" }).where(eq(students.name, "张三"));
    await expect(studentLogin(db, { classId, name: "张三" }, env.AUTH_SECRET, null))
      .rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("teacherLogin", () => {
  it("密码正确 → token", async () => {
    const r = await teacherLogin("test-admin-pw", env.ADMIN_PASSWORD, env.AUTH_SECRET);
    expect(r.token).toBeTruthy();
  });
  it("密码错误 → unauthorized", async () => {
    await expect(teacherLogin("wrong", env.ADMIN_PASSWORD, env.AUTH_SECRET))
      .rejects.toMatchObject({ code: "unauthorized" });
  });
});
