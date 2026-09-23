import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { classes, students } from "../schema";

describe("schema + D1", () => {
  it("插入班级与学生并按班级查询", async () => {
    const db = drizzle(env.DB);
    const [c] = await db.insert(classes).values({ name: "八年级(1)班" }).returning();
    await db.insert(students).values({ classId: c.id, name: "张三" });
    const rows = await db.select().from(students).where(eq(students.classId, c.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("active");
    expect(rows[0].loginVersion).toBe(0);
  });
});
