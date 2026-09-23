"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, uploadImage } from "@/lib/client/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/bento";
import { AuthImage } from "@/components/ui/auth-image";

type Corr = { id: number; text: string; imageKey: string | null; createdAt: number };
type Wrong = {
  questionId: number; assignmentId: number | null; assignmentTitle: string;
  type: string; stem: string; yourAnswer: string | string[] | null;
  correctAnswer: string | string[] | null; analysis: string | null; score: number | null; corrections: Corr[];
};
const TYPE: Record<string, string> = { single: "单选", multi: "多选", fill: "填空", short: "简答" };
function toText(v: string | string[] | null): string {
  if (v == null) return "（未作答）";
  return Array.isArray(v) ? (v.length ? v.join("、") : "（未作答）") : (v || "（未作答）");
}
const keyOf = (w: Wrong) => `${w.questionId}-${w.assignmentId ?? 0}`;

export default function WrongQuestionsPage() {
  const [items, setItems] = useState<Wrong[] | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    api<Wrong[]>("/api/student/corrections").then(setItems).catch((e) => { setItems([]); toast.error(e instanceof Error ? e.message : "加载失败"); });
  }
  useEffect(load, []);

  function openEditor(w: Wrong) {
    setOpenKey(keyOf(w)); setText(""); setFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit(w: Wrong) {
    if (!text.trim() && !file) return toast.error("请填写订正或选择图片");
    setBusy(true);
    try {
      let imageKey: string | null = null;
      if (file) imageKey = (await uploadImage(file)).key;
      await api("/api/student/corrections", { method: "POST", body: JSON.stringify({
        questionId: w.questionId, assignmentId: w.assignmentId, text: text.trim(), imageKey,
      }) });
      toast.success("订正已提交"); setOpenKey(null); setText(""); setFile(null); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "提交失败"); }
    finally { setBusy(false); }
  }

  if (items === null) return <p className="text-muted-foreground">加载中…</p>;
  if (items.length === 0) return (
    <div><SectionLabel>错题本</SectionLabel><p className="text-muted-foreground">太棒了，暂时没有错题！继续保持～</p></div>
  );

  return (
    <div className="space-y-4">
      <SectionLabel>错题本 · 订正与巩固</SectionLabel>
      {items.map((w) => (
        <Card key={keyOf(w)}>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="danger">{TYPE[w.type] ?? w.type}</Badge>
              {w.assignmentTitle && <span className="text-xs text-muted-foreground">{w.assignmentTitle}</span>}
            </div>
            <CardTitle className="text-base font-medium">{w.stem}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <p><span className="text-muted-foreground">你的作答：</span><span className="text-rose-500">{toText(w.yourAnswer)}</span></p>
            {w.correctAnswer != null && <p><span className="text-muted-foreground">标准答案：</span><span className="text-emerald-600 dark:text-emerald-400">{toText(w.correctAnswer)}</span></p>}
            {w.analysis && <p className="rounded-lg bg-muted p-3 text-muted-foreground"><b>解析：</b>{w.analysis}</p>}

            {w.corrections.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-muted-foreground">我的订正</p>
                {w.corrections.map((c) => (
                  <div key={c.id} className="soft-emerald space-y-2 rounded-2xl p-3">
                    {c.text && <p className="whitespace-pre-wrap text-sm">{c.text}</p>}
                    {c.imageKey && <AuthImage imageKey={c.imageKey} className="max-h-64 rounded-lg" />}
                  </div>
                ))}
              </div>
            )}

            {openKey === keyOf(w) ? (
              <div className="space-y-2 pt-2">
                <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="写下正确解法/反思…" />
                <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => submit(w)} disabled={busy}>{busy ? "提交中…" : "提交订正"}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpenKey(null)}>取消</Button>
                </div>
              </div>
            ) : (
              <div className="pt-1"><Button size="sm" variant="outline" onClick={() => openEditor(w)}>订正这道题</Button></div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
