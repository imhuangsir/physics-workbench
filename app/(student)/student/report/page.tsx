"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, ListChecks, Target } from "lucide-react";
import { api } from "@/lib/client/fetcher";
import { FadeIn } from "@/components/motion/fade-in";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionLabel, StatTile, ProgressBar, type Tone } from "@/components/ui/bento";

type Group = { label: string; total: number; correct: number; rate: number };
type Report = {
  assignmentsDone: number; total: number; correct: number; accuracy: number;
  byChapter: Group[]; byTag: Group[]; weak: Group[];
};

function rateTone(rate: number): Tone {
  if (rate >= 0.8) return "emerald";
  if (rate >= 0.5) return "violet";
  if (rate >= 0.3) return "amber";
  return "rose";
}

export default function ReportPage() {
  const [r, setR] = useState<Report | null>(null);

  useEffect(() => {
    api<Report>("/api/student/report").then(setR).catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
  }, []);

  if (!r) return <p className="text-muted-foreground">加载中…</p>;
  if (r.total === 0) return (
    <div><SectionLabel>学习报告</SectionLabel><p className="text-muted-foreground">完成并批改作业后，这里会生成你的知识点掌握报告。</p></div>
  );

  return (
    <div className="space-y-6">
      <SectionLabel>学习报告 · 知识点掌握</SectionLabel>

      <FadeIn>
        <div className="grid grid-cols-3 gap-3">
          <StatTile tone="blue" icon={ClipboardCheck} value={r.assignmentsDone} label="完成作业" />
          <StatTile tone="violet" icon={ListChecks} value={r.total} label="已答题（客观+已批）" />
          <StatTile tone={rateTone(r.accuracy)} icon={Target} value={`${Math.round(r.accuracy * 100)}%`} label="总正确率" />
        </div>
      </FadeIn>

      {r.weak.length > 0 && (
        <FadeIn delay={0.05}>
        <Card>
          <CardHeader><CardTitle className="text-base">薄弱项 · 建议重点复习</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {r.weak.map((w) => (
              <span key={w.label} className="soft-rose rounded-full px-3 py-1.5 text-sm font-medium">
                {w.label} · {Math.round(w.rate * 100)}%
              </span>
            ))}
          </CardContent>
        </Card>
        </FadeIn>
      )}

      <FadeIn delay={0.1}>
      <Card>
        <CardHeader><CardTitle className="text-base">按章节</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {r.byChapter.map((g) => (
            <div key={g.label} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>{g.label}</span>
                <span className="num text-muted-foreground">{Math.round(g.rate * 100)}%（{g.correct}/{g.total}）</span>
              </div>
              <ProgressBar value={g.rate * 100} tone={rateTone(g.rate)} />
            </div>
          ))}
        </CardContent>
      </Card>
      </FadeIn>

      {r.byTag.length > 0 && (
        <FadeIn delay={0.15}>
        <Card>
          <CardHeader><CardTitle className="text-base">按知识点</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {r.byTag.map((g) => (
              <div key={g.label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>{g.label}</span>
                  <span className="num text-muted-foreground">{Math.round(g.rate * 100)}%（{g.correct}/{g.total}）</span>
                </div>
                <ProgressBar value={g.rate * 100} tone={rateTone(g.rate)} />
              </div>
            ))}
          </CardContent>
        </Card>
        </FadeIn>
      )}
    </div>
  );
}
