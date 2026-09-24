import { and, eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { assignments, assignmentClasses, classes, students, submissions, answers, questions } from "../../db/schema";
import { appError } from "../../lib/http";

function mmss(sec: number | null): string {
  if (sec == null) return "";
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function csvCell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const STATUS: Record<string, string> = { not_started: "未提交", submitted: "已提交(待批改)", graded: "已批改" };

/** 导出某作业的学生成绩 CSV（含 UTF-8 BOM，便于 Excel 正确识别中文）。 */
export async function assignmentCsv(db: DB, assignmentId: number): Promise<{ filename: string; content: string }> {
  const a = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).get();
  if (!a) throw appError("not_found", "作业不存在");

  const cls = await db.select().from(assignmentClasses).where(eq(assignmentClasses.assignmentId, assignmentId));
  const classIds = cls.map((x) => x.classId);
  const roster = classIds.length ? await db.select().from(students).where(inArray(students.classId, classIds)) : [];
  const clsRows = classIds.length ? await db.select().from(classes).where(inArray(classes.id, classIds)) : [];
  const classNameMap = new Map(clsRows.map((c) => [c.id, c.name]));

  const subs = await db.select().from(submissions).where(eq(submissions.assignmentId, assignmentId));
  const subMap = new Map(subs.map((s) => [s.studentId, s]));

  const header = ["姓名", "班级", "状态", "客观分", "总分", "用时", "提交时间"];
  const lines = [header.map(csvCell).join(",")];
  for (const st of roster) {
    const sub = subMap.get(st.id);
    const name = st.dedupLabel ? `${st.name}(${st.dedupLabel})` : st.name;
    const submittedAt = sub?.submittedAt ? new Date(sub.submittedAt * 1000).toLocaleString("zh-CN") : "";
    lines.push([
      csvCell(name),
      csvCell(classNameMap.get(st.classId) ?? ""),
      csvCell(STATUS[sub?.status ?? "not_started"] ?? "未提交"),
      csvCell(sub?.objectiveScore ?? ""),
      csvCell(sub?.totalScore ?? ""),
      csvCell(mmss(sub?.durationSec ?? null)),
      csvCell(submittedAt),
    ].join(","));
  }
  const content = "﻿" + lines.join("\r\n"); // BOM + CRLF
  return { filename: `assignment-${assignmentId}-scores.csv`, content };
}

const QTYPE: Record<string, string> = { single: "单选", multi: "多选", fill: "填空", short: "简答" };

/** 导出某班的高频错题 CSV：跨该班全部作业，按错误率排序。 */
export async function classWrongCsv(db: DB, classId: number): Promise<{ filename: string; content: string }> {
  const cls = await db.select().from(classes).where(eq(classes.id, classId)).get();
  if (!cls) throw appError("not_found", "班级不存在");

  const acs = await db.select().from(assignmentClasses).where(eq(assignmentClasses.classId, classId));
  const asgIds = acs.map((x) => x.assignmentId);
  const roster = await db.select().from(students).where(eq(students.classId, classId));
  const stuIds = roster.map((s) => s.id);
  if (asgIds.length === 0 || stuIds.length === 0) {
    return { filename: `class-${classId}-wrong.csv`, content: "﻿" + "题干,题型,章节,作答次数,错误次数,错误率\r\n" };
  }

  const subs = await db.select().from(submissions)
    .where(and(inArray(submissions.assignmentId, asgIds), inArray(submissions.studentId, stuIds)));
  const subIds = subs.filter((s) => s.status !== "not_started").map((s) => s.id);
  const ans = subIds.length ? await db.select().from(answers).where(inArray(answers.submissionId, subIds)) : [];

  const agg = new Map<number, { answered: number; wrong: number }>();
  for (const a of ans) {
    if (a.isCorrect == null) continue; // 未批改的简答不计
    const g = agg.get(a.questionId) ?? { answered: 0, wrong: 0 };
    g.answered++; if (a.isCorrect === 0) g.wrong++; agg.set(a.questionId, g);
  }
  const qIds = [...agg.keys()];
  const qs = qIds.length ? await db.select().from(questions).where(inArray(questions.id, qIds)) : [];
  const qMap = new Map(qs.map((q) => [q.id, q]));

  const rows = [...agg.entries()]
    .map(([qid, v]) => ({ q: qMap.get(qid), ...v, rate: v.answered ? v.wrong / v.answered : 0 }))
    .filter((r) => r.q && r.wrong > 0)
    .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong);

  const lines = ["题干,题型,章节,作答次数,错误次数,错误率"];
  for (const r of rows) {
    lines.push([
      csvCell(r.q!.stem), csvCell(QTYPE[r.q!.type] ?? r.q!.type), csvCell(r.q!.chapter ?? ""),
      csvCell(r.answered), csvCell(r.wrong), csvCell(`${Math.round(r.rate * 100)}%`),
    ].join(","));
  }
  return { filename: `class-${classId}-wrong-questions.csv`, content: "﻿" + lines.join("\r\n") };
}
