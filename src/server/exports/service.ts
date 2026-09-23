import { eq, inArray } from "drizzle-orm";
import type { DB } from "../../db/client";
import { assignments, assignmentClasses, classes, students, submissions } from "../../db/schema";
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
