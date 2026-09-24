"use client";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { getSession } from "@/lib/client/auth";
import { splitQuestions, type DraftType } from "@/lib/ocr/split";
import { QuestionForm, buildPayload, emptyForm, LETTERS, type FormState, type QType } from "@/components/question-form";
import { ChapterSelect } from "@/components/chapter-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionLabel } from "@/components/ui/bento";

type Draft = { type: DraftType; stem: string; options: string[]; answer?: string | string[] | null; analysis?: string };
type Source = "image" | "word" | "pdf";
const SRC: { k: Source; label: string; accept: string }[] = [
  { k: "image", label: "图片 OCR", accept: "image/*" },
  { k: "word", label: "Word 文档", accept: ".docx" },
  { k: "pdf", label: "PDF 文档", accept: "application/pdf,.pdf" },
];

function formFromDraft(d: Draft): FormState {
  const idx = (L: string) => LETTERS.indexOf(String(L).trim().toUpperCase());
  const isChoice = d.type === "single" || d.type === "multi";
  const optionTexts = isChoice && d.options.length >= 2 ? d.options : ["", ""];
  let correctSingle = 0, correctMulti: number[] = [], fillAnswers = [""];
  if (d.type === "single" && typeof d.answer === "string") correctSingle = Math.max(0, idx(d.answer));
  if (d.type === "multi" && Array.isArray(d.answer)) correctMulti = d.answer.map(idx).filter((i) => i >= 0);
  if (d.type === "fill") fillAnswers = Array.isArray(d.answer) && d.answer.length ? d.answer.map(String) : [""];
  return { ...emptyForm, type: d.type as QType, stem: d.stem, optionTexts, correctSingle, correctMulti, fillAnswers, analysis: d.analysis ?? "" };
}

async function wordToText(file: File): Promise<string> {
  const mammoth = (await import("mammoth/mammoth.browser.js")).default;
  const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return String(r?.value ?? "");
}
async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  return text;
}

export default function ImportPage() {
  const [source, setSource] = useState<Source>("image");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [forms, setForms] = useState<FormState[]>([]);
  const [added, setAdded] = useState<Record<number, boolean>>({});
  const [chapter, setChapter] = useState("");

  async function extract() {
    if (!file) return toast.error("请先选择文件");
    setBusy(true); setForms([]); setAdded({});
    try {
      let t = "";
      if (source === "image") {
        const token = getSession()?.token ?? "";
        const res = await fetch("/api/teacher/ocr", { method: "POST", headers: { "Content-Type": file.type, Authorization: `Bearer ${token}` }, body: file });
        const json = await res.json().catch(() => ({})) as { data?: { text: string }; error?: { message?: string } };
        if (!res.ok) throw new Error(json?.error?.message ?? "识别失败");
        t = json.data?.text ?? "";
      } else if (source === "word") { t = await wordToText(file); }
      else { t = await pdfToText(file); }
      setText(t);
      if (!t.trim()) toast.error("没有提取到文字，换一种方式或检查文件");
      else toast.success("提取完成，点“AI 智能切题”");
    } catch (e) { toast.error(e instanceof Error ? e.message : "提取失败"); }
    finally { setBusy(false); }
  }

  async function aiSplitNow() {
    if (!text.trim()) return toast.error("请先提取文字");
    setBusy(true);
    try {
      const r = await api<{ questions: Draft[]; by: string }>("/api/teacher/split", { method: "POST", body: JSON.stringify({ text }) });
      setForms(r.questions.map(formFromDraft)); setAdded({});
      toast.success(`${r.by === "ai" ? "AI" : "规则"}切分出 ${r.questions.length} 道草稿题`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "切题失败"); }
    finally { setBusy(false); }
  }
  function ruleSplitNow() {
    setForms(splitQuestions(text).map((q) => formFromDraft({ ...q, answer: null }))); setAdded({});
  }
  function setFormAt(i: number, f: FormState) { setForms((a) => a.map((x, j) => (j === i ? f : x))); }

  async function addOne(i: number) {
    const f = forms[i];
    if (!f.stem.trim()) return toast.error("题干不能为空");
    try {
      await api("/api/teacher/questions", { method: "POST", body: JSON.stringify(buildPayload({ ...f, chapter })) });
      setAdded((m) => ({ ...m, [i]: true })); toast.success("已加入题库");
    } catch (e) { toast.error(e instanceof Error ? e.message : "加入失败（请检查答案是否设置）"); }
  }
  async function addAll() {
    setBusy(true); let okc = 0, failc = 0;
    for (let i = 0; i < forms.length; i++) {
      if (added[i] || !forms[i].stem.trim()) continue;
      try { await api("/api/teacher/questions", { method: "POST", body: JSON.stringify(buildPayload({ ...forms[i], chapter })) }); setAdded((m) => ({ ...m, [i]: true })); okc++; }
      catch { failc++; }
    }
    setBusy(false);
    if (failc) toast.warning(`已加入 ${okc} 题，${failc} 题失败（手动检查答案后再加）`);
    else toast.success(`已加入 ${okc} 题`);
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>题目导入 · 图片 / Word / PDF · AI 自动切题</SectionLabel>
        <p className="text-sm text-muted-foreground">上传试卷（图片 OCR、Word .docx 或 PDF），自动提取文字并用 AI 切分成草稿题；复核答案、选择章节后加入题库。</p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {SRC.map((s) => (
              <Button key={s.k} size="sm" variant={source === s.k ? "default" : "outline"}
                onClick={() => { setSource(s.k); setFile(null); }}>{s.label}</Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input key={source} type="file" accept={SRC.find((s) => s.k === source)!.accept}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
            <Button onClick={extract} disabled={busy}>{busy ? "处理中…" : "提取文字"}</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {source === "image" ? "支持拍照/截图，识别后可再切题。" : source === "word" ? "支持 .docx（旧版 .doc 请另存为 .docx）。" : "文字版 PDF 可直接提取；扫描版 PDF 请改用图片 OCR。"}
          </p>
        </CardContent>
      </Card>

      {(text || forms.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">提取的文字（可修正后再切题）</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-[160px]" />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={aiSplitNow} disabled={busy}>{busy ? "切题中…" : "AI 智能切题"}</Button>
              <Button size="sm" variant="outline" onClick={ruleSplitNow} disabled={busy}>规则切分</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {forms.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <span className="text-sm font-medium">导入到章节：</span>
            <ChapterSelect value={chapter} onChange={setChapter} className="min-w-[260px] flex-1" />
            <Button onClick={addAll} disabled={busy}>全部加入题库（{chapter || "未分类"}）</Button>
          </CardContent>
        </Card>
      )}

      {forms.map((f, i) => (
        <Card key={i}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">草稿题 {i + 1}</CardTitle>
            <Button size="sm" onClick={() => addOne(i)} disabled={added[i]}>{added[i] ? "已加入" : "加入题库"}</Button>
          </CardHeader>
          <CardContent>
            <QuestionForm form={f} setForm={(nf) => setFormAt(i, nf)} onSave={() => addOne(i)} saveLabel="加入题库" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
