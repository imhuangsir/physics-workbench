"use client";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { getSession } from "@/lib/client/auth";
import { splitQuestions, type DraftQuestion } from "@/lib/ocr/split";
import { QuestionForm, buildPayload, emptyForm, type FormState } from "@/components/question-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionLabel } from "@/components/ui/bento";

function formFromDraft(d: DraftQuestion): FormState {
  return {
    ...emptyForm, type: d.type, stem: d.stem,
    optionTexts: d.options.length >= 2 ? d.options : ["", ""],
    correctSingle: 0, correctMulti: [], fillAnswers: [""],
  };
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [forms, setForms] = useState<FormState[]>([]);
  const [added, setAdded] = useState<Record<number, boolean>>({});

  async function recognize() {
    if (!file) return toast.error("请先选择图片");
    setBusy(true);
    try {
      const token = getSession()?.token ?? "";
      const res = await fetch("/api/teacher/ocr", { method: "POST", headers: { "Content-Type": file.type, Authorization: `Bearer ${token}` }, body: file });
      const json = await res.json().catch(() => ({})) as { data?: { text: string; questions: DraftQuestion[] }; error?: { message?: string } };
      if (!res.ok) throw new Error(json?.error?.message ?? "识别失败");
      setText(json.data?.text ?? "");
      setForms((json.data?.questions ?? []).map(formFromDraft));
      setAdded({});
      toast.success(`识别完成，切分出 ${json.data?.questions.length ?? 0} 道草稿题`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "识别失败"); }
    finally { setBusy(false); }
  }

  function resplit() {
    setForms(splitQuestions(text).map(formFromDraft));
    setAdded({});
  }

  function setFormAt(i: number, f: FormState) {
    setForms((arr) => arr.map((x, j) => (j === i ? f : x)));
  }

  async function addToBank(i: number) {
    const f = forms[i];
    if (!f.stem.trim()) return toast.error("题干不能为空");
    try {
      await api("/api/teacher/questions", { method: "POST", body: JSON.stringify(buildPayload(f)) });
      setAdded((m) => ({ ...m, [i]: true }));
      toast.success("已加入题库");
    } catch (e) { toast.error(e instanceof Error ? e.message : "加入失败（请检查答案是否已设置）"); }
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>题目导入 · 图片 OCR 切题</SectionLabel>
        <p className="text-sm text-muted-foreground">上传试卷/题目照片，自动识别并切分为草稿题；设好正确答案后逐题加入题库。</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <Button onClick={recognize} disabled={busy}>{busy ? "识别中…" : "识别图片"}</Button>
        </CardContent>
      </Card>

      {(text || forms.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">识别文本（可修正后重新切分）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[140px]" />
            <Button variant="outline" size="sm" onClick={resplit}>重新切分</Button>
          </CardContent>
        </Card>
      )}

      {forms.map((f, i) => (
        <Card key={i}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">草稿题 {i + 1}</CardTitle>
            <Button size="sm" onClick={() => addToBank(i)} disabled={added[i]}>{added[i] ? "已加入" : "加入题库"}</Button>
          </CardHeader>
          <CardContent>
            <QuestionForm form={f} setForm={(nf) => setFormAt(i, nf)} onSave={() => addToBank(i)} saveLabel="加入题库" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
