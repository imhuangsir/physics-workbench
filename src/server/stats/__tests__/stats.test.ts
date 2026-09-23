import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../../../db/client";
import { classes, students, questions, assignments, assignmentClasses, assignmentQuestions, submissions, answers } from "../../../db/schema";
import { assignmentStats } from "../service";

describe("assignmentStats", () => {
  it("统计提交进度/平均用时/平均分/每题正确率", async () => {
    const db = getDb(env.DB);
    const [c] = await db.insert(classes).values({ name: "1班" }).returning();
    const [s1] = await db.insert(students).values({ classId: c.id, name: "甲" }).returning();
    const [s2] = await db.insert(students).values({ classId: c.id, name: "乙" }).returning();
    const [q] = await db.insert(questions).values({ type: "single", stem: "Q", optionsJson: "[]", answerJson: JSON.stringify("A") }).returning();
    const [a] = await db.insert(assignments).values({ title: "T" }).returning();
    await db.insert(assignmentClasses).values({ assignmentId: a.id, classId: c.id });
    await db.insert(assignmentQuestions).values({ assignmentId: a.id, questionId: q.id, orderNo: 1, score: 10 });
    // s1 提交且答对，s2 未提交
    const [sub] = await db.insert(submissions).values({ assignmentId: a.id, studentId: s1.id, status: "graded", submittedAt: 100, durationSec: 60, objectiveScore: 10, totalScore: 10 }).returning();
    await db.insert(answers).values({ submissionId: sub.id, questionId: q.id, contentJson: JSON.stringify("A"), isCorrect: 1, score: 10 });

    void s2;
    const st = await assignmentStats(db, a.id);
    expect(st.assigned).toBe(2);
    expect(st.submitted).toBe(1);
    expect(st.avgDurationSec).toBe(60);
    expect(st.avgTotalScore).toBe(10);
    expect(st.perQuestion[0].correctRate).toBeCloseTo(1); // 已提交里 1/1 答对
  });
});
