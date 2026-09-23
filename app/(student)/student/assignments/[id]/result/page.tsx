"use client";
import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { formatDuration } from "@/components/timer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Ans = {
  questionId: number; type: string; stem: string;
  content: string | string[] | null; isCorrect: number | null; score: number | null;
  answer: string | string[] | null; analysis: string | null; pending: boolean;
};
type Result = { status: string; objectiveScore: number | null; totalScore: number | null; durationSec: number | null; answers: Ans[] };

function toText(v: string | string[] | null): string {
  if (v == null) return "（未作答）";
  return Array.isArray(v) ? (v.length ? v.join("、") : "（未作答）") : (v || "（未作答）");
}

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [res, setRes] = useState<Result | null>(null);

  useEffect(() => {
    api<Result>(`/api/student/assignments/${Number(id)}/result`)
      .then(setRes)
      .catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
  }, [id]);

  if (!res) return <p className="text-muted-foreground">加载中…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardContent className="grid grid-cols-3 gap-4 p-6 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">{res.objectiveScore ?? "—"}</div>
            <div className="text-xs text-muted-foreground">客观得分</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{res.totalScore ?? "—"}</div>
            <div className="text-xs text-muted-foreground">总分</div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{res.durationSec != null ? formatDuration(res.durationSec) : "—"}</div>
            <div className="text-xs text-muted-foreground">用时</div>
          </div>
        </CardContent>
      </Card>

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
            <p><span className="text-muted-foreground">你的作答：</span>{toText(a.content)}</p>
            {!a.pending && a.answer != null && (
              <p><span className="text-muted-foreground">标准答案：</span>{toText(a.answer)}</p>
            )}
            {a.analysis && (
              <p className="rounded-lg bg-muted p-3 text-muted-foreground"><b>解析：</b>{a.analysis}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
