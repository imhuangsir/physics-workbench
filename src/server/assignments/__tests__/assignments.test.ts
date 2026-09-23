import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../../../db/client";
import { classes, students, questions } from "../../../db/schema";
import { createAssignment, listStudentAssignments, getStudentAssignmentDetail } from "../service";

async function seed() {
  const db = getDb(env.DB);
  const [c] = await db.insert(classes).values({ name: "1班" }).returning();
  const [s] = await db.insert(students).values({ classId: c.id, name: "甲" }).returning();
  const [q] = await db.insert(questions).values({ type: "single", stem: "Q", optionsJson: JSON.stringify([{key:"A",text:"1"}]), answerJson: JSON.stringify("A") }).returning();
  return { db, c, s, q };
}

describe("assignments", () => {
  it("建作业并分配班级 + 选题带分值", async () => {
    const { db, c, q } = await seed();
    const a = await createAssignment(db, { title: "作业一", dueAt: null, classIds: [c.id], questions: [{ questionId: q.id, orderNo: 1, score: 10 }] });
    expect(a.id).toBeGreaterThan(0);
  });
  it("学生只看到分配到本班的作业；详情不含答案", async () => {
    const { db, c, s, q } = await seed();
    await createAssignment(db, { title: "作业一", dueAt: null, classIds: [c.id], questions: [{ questionId: q.id, orderNo: 1, score: 10 }] });
    const list = await listStudentAssignments(db, s.id, c.id);
    expect(list).toHaveLength(1);
    const detail = await getStudentAssignmentDetail(db, list[0].id, s.id, c.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((detail.questions[0] as any).answerJson).toBeUndefined(); // 不下发答案
  });
});
