"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { ChapterSelect } from "@/components/chapter-select";
import { compressToDataURL } from "@/lib/client/fetcher";
import type { QuestionInput } from "@/server/questions/validate";

export const LETTERS = "ABCDEFGH".split("");
export type QType = "single" | "multi" | "fill" | "short";
export const TYPE_LABEL: Record<QType, string> = { single: "单选", multi: "多选", fill: "填空", short: "简答" };

export type FormState = {
  id: number | null; type: QType; stem: string;
  optionTexts: string[]; correctSingle: number; correctMulti: number[];
  fillAnswers: string[]; chapter: string; tags: string; difficulty: number; analysis: string; images: string[];
};

export const emptyForm: FormState = {
  id: null, type: "single", stem: "", optionTexts: ["", ""], correctSingle: 0, correctMulti: [],
  fillAnswers: [""], chapter: "", tags: "", difficulty: 1, analysis: "", images: [],
};

/** 从题库题目回填表单（编辑用）。 */
export function formFromQuestion(q: {
  id: number; type: QType; stem: string; optionsJson: string | null; answerJson: string | null;
  analysis: string | null; knowledgeTagsJson: string; chapter: string | null; difficulty: number; imagesJson?: string | null;
}): FormState {
  const options: { key: string; text: string }[] = q.optionsJson ? JSON.parse(q.optionsJson) : [];
  const ans = q.answerJson ? JSON.parse(q.answerJson) : null;
  const keys = options.map((o) => o.key);
  return {
    id: q.id, type: q.type, stem: q.stem,
    optionTexts: options.length ? options.map((o) => o.text) : ["", ""],
    correctSingle: q.type === "single" && typeof ans === "string" ? Math.max(0, keys.indexOf(ans)) : 0,
    correctMulti: q.type === "multi" && Array.isArray(ans) ? ans.map((k: string) => keys.indexOf(k)).filter((i) => i >= 0) : [],
    fillAnswers: q.type === "fill" && Array.isArray(ans) ? ans : [""],
    chapter: q.chapter ?? "", tags: (JSON.parse(q.knowledgeTagsJson || "[]") as string[]).join("，"),
    difficulty: q.difficulty, analysis: q.analysis ?? "", images: q.imagesJson ? JSON.parse(q.imagesJson) as string[] : [],
  };
}

/** 表单 → 创建/更新题目的请求体。 */
export function buildPayload(f: FormState): QuestionInput {
  const tags = f.tags.split(/[，,]/).map((t) => t.trim()).filter(Boolean);
  const base = { type: f.type, stem: f.stem, analysis: f.analysis, knowledgeTags: tags, chapter: f.chapter, difficulty: f.difficulty, images: f.images };
  if (f.type === "single") {
    const options = f.optionTexts.map((text, i) => ({ key: LETTERS[i], text }));
    return { ...base, options, answer: LETTERS[f.correctSingle] };
  }
  if (f.type === "multi") {
    const options = f.optionTexts.map((text, i) => ({ key: LETTERS[i], text }));
    return { ...base, options, answer: [...f.correctMulti].sort((a, b) => a - b).map((i) => LETTERS[i]) };
  }
  if (f.type === "fill") return { ...base, answer: f.fillAnswers.map((s) => s.trim()).filter(Boolean) };
  return base;
}
// PLACEHOLDER_COMPONENT

export function QuestionForm({ form, setForm, onSave, onCancel, saveLabel = "保存" }: {
  form: FormState; setForm: (f: FormState) => void; onSave?: () => void; onCancel?: () => void; saveLabel?: string;
}) {
  const isChoice = form.type === "single" || form.type === "multi";
  function setOpt(i: number, v: string) {
    const optionTexts = [...form.optionTexts]; optionTexts[i] = v; setForm({ ...form, optionTexts });
  }
  function addOpt() { if (form.optionTexts.length < LETTERS.length) setForm({ ...form, optionTexts: [...form.optionTexts, ""] }); }
  function removeOpt(i: number) {
    if (form.optionTexts.length <= 2) return;
    const optionTexts = form.optionTexts.filter((_, j) => j !== i);
    setForm({ ...form, optionTexts, correctSingle: 0, correctMulti: form.correctMulti.filter((k) => k !== i).map((k) => (k > i ? k - 1 : k)) });
  }
  function toggleMulti(i: number) {
    setForm({ ...form, correctMulti: form.correctMulti.includes(i) ? form.correctMulti.filter((k) => k !== i) : [...form.correctMulti, i] });
  }
  function setFill(i: number, v: string) { const a = [...form.fillAnswers]; a[i] = v; setForm({ ...form, fillAnswers: a }); }
  async function addImages(files: FileList | null) {
    if (!files || !files.length) return;
    const added: string[] = [];
    for (const f of Array.from(files)) { const d = await compressToDataURL(f); if (d) added.push(d); }
    if (added.length) setForm({ ...form, images: [...form.images, ...added] });
  }

  return (
    <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
      <div className="space-y-1.5">
        <Label>题型</Label>
        <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as QType })}>
          {(Object.keys(TYPE_LABEL) as QType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>题干</Label>
        <Textarea value={form.stem} onChange={(e) => setForm({ ...form, stem: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <Label>配图（图1 / 图2… · 可选，可多张）</Label>
        {form.images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.images.map((src, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`配图 ${i + 1}`} className="h-24 w-auto rounded-lg border border-border bg-white object-contain" />
                <button type="button" aria-label="删除配图" onClick={() => setForm({ ...form, images: form.images.filter((_, j) => j !== i) })}
                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">×</button>
              </div>
            ))}
          </div>
        )}
        <input type="file" accept="image/*" multiple onChange={(e) => { void addImages(e.target.files); e.target.value = ""; }} className="text-sm" />
      </div>
      {isChoice && (
        <div className="space-y-1.5">
          <Label>选项{form.type === "single" ? "（选中正确项）" : "（勾选所有正确项）"}</Label>
          {form.optionTexts.map((text, i) => (
            <div key={i} className="flex items-center gap-2">
              {form.type === "single" ? (
                <input type="radio" name="correct" checked={form.correctSingle === i} onChange={() => setForm({ ...form, correctSingle: i })} />
              ) : (
                <input type="checkbox" checked={form.correctMulti.includes(i)} onChange={() => toggleMulti(i)} />
              )}
              <span className="w-5 text-sm font-medium">{LETTERS[i]}</span>
              <Input value={text} onChange={(e) => setOpt(i, e.target.value)} placeholder={`选项 ${LETTERS[i]}`} />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeOpt(i)} disabled={form.optionTexts.length <= 2}>删</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addOpt} disabled={form.optionTexts.length >= LETTERS.length}>+ 添加选项</Button>
        </div>
      )}
      {/* PLACEHOLDER_TAIL */}
      {form.type === "fill" && (
        <div className="space-y-1.5">
          <Label>可接受答案（任一命中即算对）</Label>
          {form.fillAnswers.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={a} onChange={(e) => setFill(i, e.target.value)} placeholder={`答案 ${i + 1}`} />
              <Button type="button" variant="ghost" size="sm"
                onClick={() => setForm({ ...form, fillAnswers: form.fillAnswers.filter((_, j) => j !== i) })}
                disabled={form.fillAnswers.length <= 1}>删</Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, fillAnswers: [...form.fillAnswers, ""] })}>+ 添加答案</Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5"><Label>章节</Label><ChapterSelect value={form.chapter} onChange={(v) => setForm({ ...form, chapter: v })} /></div>
        <div className="space-y-1.5">
          <Label>难度</Label>
          <Select value={String(form.difficulty)} onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>知识点标签（逗号分隔）</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>解析（简答题此处作为 AI 批改参考要点）</Label><Textarea value={form.analysis} onChange={(e) => setForm({ ...form, analysis: e.target.value })} /></div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <Button variant="outline" onClick={onCancel}>取消</Button>}
        {onSave && <Button onClick={onSave}>{saveLabel}</Button>}
      </div>
    </div>
  );
}
