"use client";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/bento";

type Item = {
  answerId: number; studentName: string; content: string;
  score: number | null; isCorrect: number | null; aiFeedback: string | null; gradedBy: string | null;
};
type Q = { questionId: number; orderNo: number; stem: string; reference: string | null; fullScore: number; items: Item[] };
type Data = { assignmentId: number; title: string; questions: Q[] };

export default function GradePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const assignmentId = Number(id);
  const [data, setData] = useState<Data | null>(null);
  const [grading, setGrading] = useState(false);
  const [edit, setEdit] = useState<Record<number, { score: string; feedback: string }>>({});

  function load() {
    api<Data>(`/api/teacher/assignments/${assignmentId}/shorts`).then(setData).catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
  }
  useEffect(load, [assignmentId]);

  async function aiGradeAll() {
    setGrading(true);
    try {
      const r = await api<{ graded: number; failed: number }>(`/api/teacher/assignments/${assignmentId}/grade`, { method: "POST" });
      toast.success(`AI 批改完成：${r.graded} 条${r.failed ? `，${r.failed} 条需人工复核` : ""}`);
      load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "批改失败"); }
    finally { setGrading(false); }
  }

  async function saveManual(it: Item, fullScore: number) {
    const e = edit[it.answerId] ?? { score: String(it.score ?? 0), feedback: it.aiFeedback ?? "" };
    const score = Number(e.score);
    if (Number.isNaN(score) || score < 0 || score > fullScore) return toast.error(`分数需在 0~${fullScore} 之间`);
    try {
      await api(`/api/teacher/answers/${it.answerId}`, { method: "PATCH", body: JSON.stringify({ score, feedback: e.feedback }) });
      toast.success("已保存"); load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "保存失败"); }
  }

  if (!data) return <p className="text-muted-foreground">加载中…</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <SectionLabel className="mb-1">简答批改 · {data.title}</SectionLabel>
          <p className="text-sm text-muted-foreground">AI 先给初评，可逐条人工覆盖</p>
        </div>
        <Button onClick={aiGradeAll} disabled={grading}>{grading ? "AI 批改中…" : "AI 批改全部未批"}</Button>
      </div>

      {data.questions.length === 0 && <p className="text-sm text-muted-foreground">本作业没有简答题。</p>}

      {data.questions.map((q) => (
        <Card key={q.questionId}>
          <CardHeader>
            <CardTitle className="text-base">第 {q.orderNo} 题（简答 · 满分 {q.fullScore}）</CardTitle>
            <p className="text-sm">{q.stem}</p>
            {q.reference && <p className="text-xs text-muted-foreground">参考要点：{q.reference}</p>}
          </CardHeader>
          <CardContent className="space-y-3">
            {q.items.length === 0 && <p className="text-sm text-muted-foreground">暂无学生作答。</p>}
            {q.items.map((it) => {
              const e = edit[it.answerId] ?? { score: String(it.score ?? 0), feedback: it.aiFeedback ?? "" };
              return (
                <div key={it.answerId} className="space-y-2 rounded-2xl border p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{it.studentName}</span>
                    {it.gradedBy === "ai" && <Badge variant="info">AI 已批</Badge>}
                    {it.gradedBy === "manual" && <Badge variant="success">人工已批</Badge>}
                    {!it.gradedBy && <Badge variant="warning">待批改</Badge>}
                  </div>
                  <p className="rounded-lg bg-secondary p-2 text-sm">{it.content || "（空白未作答）"}</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="w-24">
                      <label className="text-xs text-muted-foreground">得分（满 {q.fullScore}）</label>
                      <Input type="number" min={0} max={q.fullScore} value={e.score}
                        onChange={(ev) => setEdit((m) => ({ ...m, [it.answerId]: { ...e, score: ev.target.value } }))} />
                    </div>
                    <div className="min-w-[200px] flex-1">
                      <label className="text-xs text-muted-foreground">评语</label>
                      <Textarea className="min-h-[44px]" value={e.feedback}
                        onChange={(ev) => setEdit((m) => ({ ...m, [it.answerId]: { ...e, feedback: ev.target.value } }))} />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => saveManual(it, q.fullScore)}>保存</Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
