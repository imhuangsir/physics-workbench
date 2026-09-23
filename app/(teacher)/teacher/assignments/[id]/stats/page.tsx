"use client";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { formatDuration } from "@/components/timer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionLabel, StatTile, ProgressBar, type Tone } from "@/components/ui/bento";
import { getSession } from "@/lib/client/auth";

type PerQ = { questionId: number; orderNo: number; answered: number; correctRate: number };
type Stats = { assigned: number; submitted: number; progress: number; avgDurationSec: number; avgTotalScore: number; perQuestion: PerQ[] };

function rateTone(rate: number): Tone {
  if (rate >= 0.8) return "emerald";
  if (rate >= 0.5) return "violet";
  if (rate >= 0.3) return "amber";
  return "rose";
}

export default function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const assignmentId = Number(id);
  const [st, setSt] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>(`/api/teacher/assignments/${assignmentId}/stats`)
      .then(setSt)
      .catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
  }, [assignmentId]);

  async function exportCsv() {
    const token = getSession()?.token ?? "";
    try {
      const res = await fetch(`/api/teacher/assignments/${assignmentId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `assignment-${assignmentId}-stats.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "导出失败");
    }
  }

  if (!st) return <p className="text-muted-foreground">加载中…</p>;

  const tiles: { label: string; value: string; tone: Tone }[] = [
    { label: "应交", value: String(st.assigned), tone: "violet" },
    { label: "已交", value: String(st.submitted), tone: "blue" },
    { label: "提交率", value: `${Math.round(st.progress * 100)}%`, tone: "emerald" },
    { label: "平均用时", value: formatDuration(st.avgDurationSec), tone: "amber" },
    { label: "平均分", value: String(st.avgTotalScore), tone: "rose" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SectionLabel className="mb-0">作业统计</SectionLabel>
        <Button variant="outline" size="sm" onClick={exportCsv}>导出 CSV</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <StatTile key={t.label} value={t.value} label={t.label} tone={t.tone} />
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">每题正确率</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {st.perQuestion.map((q) => (
            <div key={q.questionId} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>第 {q.orderNo} 题</span>
                <span className="num text-muted-foreground">{Math.round(q.correctRate * 100)}%（{q.answered} 人作答）</span>
              </div>
              <ProgressBar value={q.correctRate * 100} tone={rateTone(q.correctRate)} />
            </div>
          ))}
          {st.perQuestion.length === 0 && <p className="text-sm text-muted-foreground">暂无数据</p>}
        </CardContent>
      </Card>
    </div>
  );
}
