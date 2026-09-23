"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { useTimer, formatDuration } from "@/components/timer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Option = { key: string; text: string };
type Q = { questionId: number; type: "single" | "multi" | "fill" | "short"; stem: string; optionsJson: string | null; orderNo: number; score: number };
type Detail = { id: number; title: string; dueAt: number | null; questions: Q[] };
type AnswerMap = Record<number, string | string[]>;

function parseOptions(json: string | null): Option[] {
  if (!json) return [];
  try { return JSON.parse(json) as Option[]; } catch { return []; }
}

export default function AnswerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const assignmentId = Number(id);
  const router = useRouter();
  const { elapsed, clear } = useTimer(assignmentId);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api(`/api/student/assignments/${assignmentId}/start`, { method: "POST" });
        const d = await api<Detail>(`/api/student/assignments/${assignmentId}`);
        if (!cancelled) setDetail(d);
      } catch (e) {
        if (!cancelled) toast.error(e instanceof Error ? e.message : "加载失败");
      }
    })();
    return () => { cancelled = true; };
  }, [assignmentId]);

  function setSingle(qid: number, key: string) {
    setAnswers((a) => ({ ...a, [qid]: key }));
  }
  function toggleMulti(qid: number, key: string) {
    setAnswers((a) => {
      const cur = Array.isArray(a[qid]) ? (a[qid] as string[]) : [];
      return { ...a, [qid]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
    });
  }
  function setText(qid: number, val: string) {
    setAnswers((a) => ({ ...a, [qid]: val }));
  }

  async function submit() {
    if (!detail) return;
    setSubmitting(true);
    try {
      const payload = {
        durationSec: elapsed,
        answers: detail.questions.map((q) => ({ questionId: q.questionId, content: answers[q.questionId] ?? (q.type === "multi" ? [] : "") })),
      };
      await api(`/api/student/assignments/${assignmentId}/submit`, { method: "POST", body: JSON.stringify(payload) });
      clear();
      toast.success("提交成功");
      router.replace(`/student/assignments/${assignmentId}/result`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (!detail) return <p className="text-muted-foreground">加载中…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="sticky top-14 z-10 -mx-4 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur">
        <h1 className="truncate text-lg font-semibold">{detail.title}</h1>
        <span className="tabular-nums text-sm text-muted-foreground">用时 {formatDuration(elapsed)}</span>
      </div>

      {detail.questions.map((q, idx) => {
        const opts = parseOptions(q.optionsJson);
        const cur = answers[q.questionId];
        return (
          <Card key={q.questionId}>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
              <CardTitle className="text-base font-medium">{idx + 1}. {q.stem}</CardTitle>
              <Badge variant="neutral">{q.score} 分</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.type === "single" && opts.map((o) => (
                <label key={o.key} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-accent">
                  <input type="radio" name={`q${q.questionId}`} checked={cur === o.key} onChange={() => setSingle(q.questionId, o.key)} />
                  <span><b className="mr-1">{o.key}.</b>{o.text}</span>
                </label>
              ))}
              {q.type === "multi" && opts.map((o) => (
                <label key={o.key} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-accent">
                  <input type="checkbox" checked={Array.isArray(cur) && cur.includes(o.key)} onChange={() => toggleMulti(q.questionId, o.key)} />
                  <span><b className="mr-1">{o.key}.</b>{o.text}</span>
                </label>
              ))}
              {q.type === "fill" && (
                <Input value={typeof cur === "string" ? cur : ""} onChange={(e) => setText(q.questionId, e.target.value)} placeholder="请填写答案" />
              )}
              {q.type === "short" && (
                <Textarea value={typeof cur === "string" ? cur : ""} onChange={(e) => setText(q.questionId, e.target.value)} placeholder="请作答" />
              )}
            </CardContent>
          </Card>
        );
      })}

      <Button size="lg" className="w-full" onClick={submit} disabled={submitting}>
        {submitting ? "提交中…" : "提交作业"}
      </Button>
    </div>
  );
}
