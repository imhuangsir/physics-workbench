"use client";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { formatDuration } from "@/components/timer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PerQ = { questionId: number; orderNo: number; answered: number; correctRate: number };
type Stats = { assigned: number; submitted: number; progress: number; avgDurationSec: number; avgTotalScore: number; perQuestion: PerQ[] };

export default function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [st, setSt] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>(`/api/teacher/assignments/${Number(id)}/stats`)
      .then(setSt)
      .catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
  }, [id]);

  if (!st) return <p className="text-muted-foreground">加载中…</p>;

  const tiles = [
    { label: "应交", value: String(st.assigned) },
    { label: "已交", value: String(st.submitted) },
    { label: "提交率", value: `${Math.round(st.progress * 100)}%` },
    { label: "平均用时", value: formatDuration(st.avgDurationSec) },
    { label: "平均分", value: String(st.avgTotalScore) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold tabular-nums">{t.value}</div>
              <div className="text-xs text-muted-foreground">{t.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">每题正确率</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {st.perQuestion.map((q) => (
            <div key={q.questionId} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>第 {q.orderNo} 题</span>
                <span className="tabular-nums text-muted-foreground">{Math.round(q.correctRate * 100)}%（{q.answered} 人作答）</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round(q.correctRate * 100)}%` }} />
              </div>
            </div>
          ))}
          {st.perQuestion.length === 0 && <p className="text-sm text-muted-foreground">暂无数据</p>}
        </CardContent>
      </Card>
    </div>
  );
}
