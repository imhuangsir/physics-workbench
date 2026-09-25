"use client";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { formatDuration } from "@/components/timer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/ui/bento";
import { QuestionImages, parseImages } from "@/components/question-images";
import { cn } from "@/lib/utils";

type Ans = {
  questionId: number; type: string; stem: string; imagesJson?: string | null;
  content: string | string[] | null; isCorrect: number | null; score: number | null;
  answer: string | string[] | null; analysis: string | null; aiFeedback: string | null; pending: boolean;
};
type Result = { status: string; objectiveScore: number | null; totalScore: number | null; durationSec: number | null; answers: Ans[] };
type Bucket = { label: string; count: number; mine: boolean };
type Rank = { myScore: number; rank: number; total: number; average: number; max: number; fullScore: number; beatPercent: number; buckets: Bucket[] };

function toText(v: string | string[] | null): string {
  if (v == null) return "（未作答）";
  return Array.isArray(v) ? (v.length ? v.join("、") : "（未作答）") : (v || "（未作答）");
}

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [res, setRes] = useState<Result | null>(null);
  const [rank, setRank] = useState<Rank | null>(null);

  useEffect(() => {
    const aid = Number(id);
    api<Result>(`/api/student/assignments/${aid}/result`)
      .then(setRes)
      .catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
    api<Rank>(`/api/student/assignments/${aid}/rank`).then(setRank).catch(() => {});
  }, [id]);

  if (!res) return <p className="text-muted-foreground">加载中…</p>;

  const maxCount = rank ? Math.max(1, ...rank.buckets.map((b) => b.count)) : 1;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile tone="violet" value={res.objectiveScore ?? "—"} label="客观得分" />
        <StatTile tone="emerald" value={res.totalScore ?? "—"} label="总分" />
        <StatTile tone="amber" value={res.durationSec != null ? formatDuration(res.durationSec) : "—"} label="用时" />
      </div>

      {rank && rank.total > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">班级排名 · 成绩分布</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><div className="num text-2xl font-extrabold text-primary">{rank.rank}<span className="text-sm font-normal text-muted-foreground">/{rank.total}</span></div><div className="text-xs text-muted-foreground">班级排名</div></div>
              <div><div className="num text-2xl font-extrabold">{rank.beatPercent}%</div><div className="text-xs text-muted-foreground">超过同学</div></div>
              <div><div className="num text-2xl font-extrabold">{rank.average}</div><div className="text-xs text-muted-foreground">班级平均</div></div>
            </div>
            <div className="flex items-end gap-1.5 pt-2">
              {rank.buckets.map((b) => (
                <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-20 w-full items-end">
                    <div className={cn("w-full rounded-t-md", b.mine ? "grad-violet" : "bg-secondary")}
                      style={{ height: `${Math.max(6, (b.count / maxCount) * 100)}%` }} title={`${b.count} 人`} />
                  </div>
                  <span className={cn("text-[10px]", b.mine ? "font-semibold text-primary" : "text-muted-foreground")}>{b.label}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">紫色为你所在分数段（满分 {rank.fullScore}）</p>
          </CardContent>
        </Card>
      )}

      {res.answers.map((a, idx) => (
        <Card key={a.questionId}>
          <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle className="text-base font-medium">{idx + 1}. {a.stem}</CardTitle>
            {a.pending ? (
              <Badge variant="warning">待老师批改</Badge>
            ) : a.isCorrect === 1 ? (
              <span className="shrink-0 font-semibold text-emerald-500">✓ {a.score}分</span>
            ) : (
              <span className="shrink-0 font-semibold text-red-500">✗ {a.score ?? 0}分</span>
            )}
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <QuestionImages images={parseImages(a.imagesJson)} className="mb-1" />
            <p><span className="text-muted-foreground">你的作答：</span>{toText(a.content)}</p>
            {!a.pending && a.answer != null && (
              <p><span className="text-muted-foreground">标准答案：</span>{toText(a.answer)}</p>
            )}
            {a.analysis && (
              <p className="rounded-lg bg-muted p-3 text-muted-foreground"><b>解析：</b>{a.analysis}</p>
            )}
            {a.type === "short" && !a.pending && a.aiFeedback && (
              <p className="soft-violet rounded-lg p-3"><b>老师/AI 评语：</b>{a.aiFeedback}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
