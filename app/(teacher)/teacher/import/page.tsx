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
type Ans = { answer: string | string[] | null; analysis?: string };
type Source = "image" | "word" | "pdf";
const SRC: { k: Source; label: string; accept: string }[] = [
  { k: "image", label: "图片 OCR", accept: "image/*" },
  { k: "word", label: "Word 文档", accept: ".docx" },
  { k: "pdf", label: "PDF 文档", accept: "application/pdf,.pdf" },
];
const idx = (L: string) => LETTERS.indexOf(String(L).trim().toUpperCase());

function formFromDraft(d: Draft): FormState {
  const isChoice = d.type === "single" || d.type === "multi";
  const optionTexts = isChoice && d.options.length >= 2 ? d.options : ["", ""];
  let correctSingle = 0, correctMulti: number[] = [], fillAnswers = [""];
  if (d.type === "single" && typeof d.answer === "string") correctSingle = Math.max(0, idx(d.answer));
  if (d.type === "multi" && Array.isArray(d.answer)) correctMulti = d.answer.map(idx).filter((i) => i >= 0);
  if (d.type === "fill") fillAnswers = Array.isArray(d.answer) && d.answer.length ? d.answer.map(String) : [""];
  return { ...emptyForm, type: d.type as QType, stem: d.stem, optionTexts, correctSingle, correctMulti, fillAnswers, analysis: d.analysis ?? "" };
}
/** 用上传答案覆盖表单里的答案（优先级高于 AI 切题）。 */
function applyAns(f: FormState, a: Ans): FormState {
  const nf = { ...f };
  if (a.analysis) nf.analysis = a.analysis;
  if (f.type === "single" && typeof a.answer === "string") { const k = idx(a.answer); if (k >= 0) nf.correctSingle = k; }
  else if (f.type === "multi" && Array.isArray(a.answer)) { const ks = a.answer.map(idx).filter((k) => k >= 0); if (ks.length) nf.correctMulti = ks; }
  else if (f.type === "fill" && Array.isArray(a.answer) && a.answer.length) nf.fillAnswers = a.answer.map(String);
  else if (f.type === "short" && typeof a.answer === "string" && a.answer) nf.analysis = a.answer;
  return nf;
}

async function ocrToText(file: File): Promise<string> {
  const token = getSession()?.token ?? "";
  const res = await fetch("/api/teacher/ocr", { method: "POST", headers: { "Content-Type": file.type, Authorization: `Bearer ${token}` }, body: file });
  const json = await res.json().catch(() => ({})) as { data?: { text: string }; error?: { message?: string } };
  if (!res.ok) throw new Error(json?.error?.message ?? "识别失败");
  return json.data?.text ?? "";
}
async function wordToText(file: File): Promise<string> {
  const mammoth = (await import("mammoth/mammoth.browser.js")).default;
  return String((await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() }))?.value ?? "");
}
async function pdfToText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) { const c = await (await doc.getPage(i)).getTextContent(); text += c.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n"; }
  return text;
}
async function fileToText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.type.startsWith("image/")) return ocrToText(file);
  if (name.endsWith(".pdf") || file.type === "application/pdf") return pdfToText(file);
  return wordToText(file);
}

export default function ImportPage() {
  const [source, setSource] = useState<Source>("image");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const [forms, setForms] = useState<FormState[]>([]);
  const [chapter, setChapter] = useState("");
  const [ansFile, setAnsFile] = useState<File | null>(null);

  async function extract() {
    if (!file) return toast.error("请先选择文件");
    setBusy(true); setForms([]);
    try {
      const t = source === "image" ? await ocrToText(file) : source === "word" ? await wordToText(file) : await pdfToText(file);
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
      setForms(r.questions.map(formFromDraft));
      toast.success(`${r.by === "ai" ? "AI" : "规则"}切分出 ${r.questions.length} 道草稿题`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "切题失败"); }
    finally { setBusy(false); }
  }
  function ruleSplitNow() { setForms(splitQuestions(text).map((q) => formFromDraft({ ...q, answer: null }))); }
  function setFormAt(i: number, f: FormState) { setForms((a) => a.map((x, j) => (j === i ? f : x))); }

  async function fillAnswers() {
    if (!ansFile) return toast.error("请先选择参考答案文件");
    if (!forms.length) return toast.error("请先切分出题目");
    setBusy(true);
    try {
      const answerText = await fileToText(ansFile);
      if (!answerText.trim()) throw new Error("答案文件没提取到文字");
      const r = await api<{ answers: Ans[] }>("/api/teacher/fill-answers", { method: "POST", body: JSON.stringify({
        questions: forms.map((f) => ({ stem: f.stem, type: f.type, options: f.optionTexts })), answerText,
      }) });
      setForms((arr) => arr.map((f, i) => (r.answers[i] ? applyAns(f, r.answers[i]) : f)));
      toast.success("已用参考答案填入（覆盖原答案），请核对");
    } catch (e) { toast.error(e instanceof Error ? e.message : "填充失败"); }
    finally { setBusy(false); }
  }

  async function importAll() {
    if (!forms.length) return;
    setBusy(true); let okc = 0, failc = 0;
    for (const f of forms) {
      if (!f.stem.trim()) { failc++; continue; }
      try { await api("/api/teacher/questions", { method: "POST", body: JSON.stringify(buildPayload({ ...f, chapter })) }); okc++; }
      catch { failc++; }
    }
    setBusy(false);
    if (failc) toast.warning(`已导入 ${okc} 题，${failc} 题失败（检查答案是否设好）`);
    else { toast.success(`已导入 ${okc} 题到「${chapter || "未分类"}」`); setForms([]); setText(""); setFile(null); setAnsFile(null); }
  }

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>题目导入 · 图片 / Word / PDF · AI 自动切题</SectionLabel>
        <p className="text-sm text-muted-foreground">上传试卷，自动提取文字并用 AI 切成草稿题；可再传一份参考答案自动填入；逐题核对后，最后统一选章节导入。</p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">
            {SRC.map((s) => (
              <Button key={s.k} size="sm" variant={source === s.k ? "default" : "outline"} onClick={() => { setSource(s.k); setFile(null); }}>{s.label}</Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input key={source} type="file" accept={SRC.find((s) => s.k === source)!.accept} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
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
              <Button size="sm" onClick={aiSplitNow} disabled={busy}>{busy ? "处理中…" : "AI 智能切题"}</Button>
              <Button size="sm" variant="outline" onClick={ruleSplitNow} disabled={busy}>规则切分</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {forms.map((f, i) => (
        <Card key={i}>
          <CardHeader className="space-y-0"><CardTitle className="text-base">草稿题 {i + 1}</CardTitle></CardHeader>
          <CardContent><QuestionForm form={f} setForm={(nf) => setFormAt(i, nf)} /></CardContent>
        </Card>
      ))}

      {forms.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">（可选）上传参考答案，自动填入各题答案</p>
              <p className="text-xs text-muted-foreground">支持答案的图片 / Word / PDF；AI 会把答案对应到上面各题并<b>覆盖</b>切题时给的答案，填完请核对。</p>
              <div className="flex flex-wrap items-center gap-3">
                <input type="file" accept="image/*,.docx,application/pdf,.pdf" onChange={(e) => setAnsFile(e.target.files?.[0] ?? null)} className="text-sm" />
                <Button size="sm" variant="outline" onClick={fillAnswers} disabled={busy || !ansFile}>用参考答案填入</Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t pt-3">
              <span className="text-sm font-medium">导入到章节：</span>
              <ChapterSelect value={chapter} onChange={setChapter} className="min-w-[240px] flex-1" />
              <Button onClick={importAll} disabled={busy}>{busy ? "导入中…" : `导入题库（共 ${forms.length} 题 → ${chapter || "未分类"}）`}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
