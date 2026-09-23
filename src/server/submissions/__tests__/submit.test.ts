import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../../../db/client";
import { classes, students, questions, assignments, assignmentClasses, assignmentQuestions } from "../../../db/schema";
import { submitAssignment, getResult } from "../service";

async function seed() {
  const db = getDb(env.DB);
  const [c] = await db.insert(classes).values({ name: "1班" }).returning();
  const [s] = await db.insert(students).values({ classId: c.id, name: "甲" }).returning();
  const [q1] = await db.insert(questions).values({ type: "single", stem: "S", optionsJson: JSON.stringify([{key:"A",text:"1"},{key:"B",text:"2"}]), answerJson: JSON.stringify("B") }).returning();
  const [q2] = await db.insert(questions).values({ type: "short", stem: "简答" }).returning();
  const [a] = await db.insert(assignments).values({ title: "T" }).returning();
  await db.insert(assignmentClasses).values({ assignmentId: a.id, classId: c.id });
  await db.insert(assignmentQuestions).values([
    { assignmentId: a.id, questionId: q1.id, orderNo: 1, score: 10 },
    { assignmentId: a.id, questionId: q2.id, orderNo: 2, score: 10 },
  ]);
  return { db, c, s, a, q1, q2 };
}

describe("submitAssignment", () => {
  it("含简答的作业提交后状态为 submitted，客观题判分正确", async () => {
    const { db, c, s, a, q1, q2 } = await seed();
    const r = await submitAssignment(db, a.id, s.id, c.id, {
      durationSec: 120,
      answers: [
        { questionId: q1.id, content: "B" },   // 单选正确 → 10
        { questionId: q2.id, content: "我的简答" }, // 简答不判
      ],
    });
    expect(r.objectiveScore).toBe(10);
    expect(r.status).toBe("submitted"); // 含未判简答
  });
  it("重复提交 → conflict", async () => {
    const { db, c, s, a, q1 } = await seed();
    await submitAssignment(db, a.id, s.id, c.id, { durationSec: 10, answers: [{ questionId: q1.id, content: "A" }] });
    await expect(submitAssignment(db, a.id, s.id, c.id, { durationSec: 10, answers: [{ questionId: q1.id, content: "A" }] }))
      .rejects.toMatchObject({ code: "conflict" });
  });
  it("纯客观作业提交即 graded；结果含对错与解析", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "2班" }).returning();
    const [s] = await db.insert(students).values({ classId: c.id, name: "乙" }).returning();
    const [q] = await db.insert(questions).values({ type: "single", stem: "S", optionsJson: JSON.stringify([{key:"A",text:"1"}]), answerJson: JSON.stringify("A"), analysis: "因为A" }).returning();
    const [a] = await db.insert(assignments).values({ title: "T2" }).returning();
    await db.insert(assignmentClasses).values({ assignmentId: a.id, classId: c.id });
    await db.insert(assignmentQuestions).values({ assignmentId: a.id, questionId: q.id, orderNo: 1, score: 10 });
    const r = await submitAssignment(db, a.id, s.id, c.id, { durationSec: 30, answers: [{ questionId: q.id, content: "A" }] });
    expect(r.status).toBe("graded");
    const res = await getResult(db, a.id, s.id);
    expect(res.answers[0].isCorrect).toBe(1);
    expect(res.answers[0].analysis).toBe("因为A");
  });
});
