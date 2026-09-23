"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

const LETTERS = "ABCDEFGH".split("");
type QType = "single" | "multi" | "fill" | "short";
const TYPE_LABEL: Record<QType, string> = { single: "单选", multi: "多选", fill: "填空", short: "简答" };

type Question = {
  id: number; type: QType; stem: string; optionsJson: string | null; answerJson: string | null;
  analysis: string | null; knowledgeTagsJson: string; chapter: string | null; difficulty: number;
};

type FormState = {
  id: number | null; type: QType; stem: string;
  optionTexts: string[]; correctSingle: number; correctMulti: number[];
  fillAnswers: string[]; chapter: string; tags: string; difficulty: number; analysis: string;
};

const emptyForm: FormState = {
  id: null, type: "single", stem: "", optionTexts: ["", ""], correctSingle: 0, correctMulti: [],
  fillAnswers: [""], chapter: "", tags: "", difficulty: 1, analysis: "",
};

export default function QuestionsPage() {
  const [list, setList] = useState<Question[]>([]);
  const [fType, setFType] = useState("");
  const [fChapter, setFChapter] = useState("");
  const [form, setForm] = useState<FormState | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (fType) p.set("type", fType);
    if (fChapter) p.set("chapter", fChapter);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [fType, fChapter]);

  function load() {
    api<Question[]>(`/api/teacher/questions${query}`).then(setList).catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
  }
  useEffect(load, [query]);

  function openCreate() { setForm({ ...emptyForm }); }
  function openEdit(q: Question) {
    const options: { key: string; text: string }[] = q.optionsJson ? JSON.parse(q.optionsJson) : [];
    const ans = q.answerJson ? JSON.parse(q.answerJson) : null;
    const keys = options.map((o) => o.key);
    setForm({
      id: q.id, type: q.type, stem: q.stem,
      optionTexts: options.length ? options.map((o) => o.text) : ["", ""],
      correctSingle: q.type === "single" && typeof ans === "string" ? Math.max(0, keys.indexOf(ans)) : 0,
      correctMulti: q.type === "multi" && Array.isArray(ans) ? ans.map((k: string) => keys.indexOf(k)).filter((i) => i >= 0) : [],
      fillAnswers: q.type === "fill" && Array.isArray(ans) ? ans : [""],
      chapter: q.chapter ?? "", tags: (JSON.parse(q.knowledgeTagsJson || "[]") as string[]).join("，"),
      difficulty: q.difficulty, analysis: q.analysis ?? "",
    });
  }

  function buildPayload(f: FormState) {
    const tags = f.tags.split(/[，,]/).map((t) => t.trim()).filter(Boolean);
    const base = { type: f.type, stem: f.stem, analysis: f.analysis, knowledgeTags: tags, chapter: f.chapter, difficulty: f.difficulty };
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

  async function save() {
    if (!form) return;
    if (!form.stem.trim()) return toast.error("请填写题干");
    try {
      const payload = buildPayload(form);
      if (form.id) await api(`/api/teacher/questions/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/api/teacher/questions", { method: "POST", body: JSON.stringify(payload) });
      toast.success("已保存"); setForm(null); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "保存失败"); }
  }

  async function del(q: Question) {
    if (!confirm("确定删除该题？")) return;
    try { await api(`/api/teacher/questions/${q.id}`, { method: "DELETE" }); toast.success("已删除"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "删除失败"); }
  }

  // PLACEHOLDER_JSX
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={fType} onChange={(e) => setFType(e.target.value)} className="w-32">
          <option value="">全部题型</option>
          {(Object.keys(TYPE_LABEL) as QType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </Select>
        <Input value={fChapter} onChange={(e) => setFChapter(e.target.value)} placeholder="按章节过滤" className="w-40" />
        <div className="ml-auto"><Button onClick={openCreate}>新建题目</Button></div>
      </div>

      <div className="space-y-2">
        {list.map((q) => (
          <Card key={q.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-2 p-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant="neutral">{TYPE_LABEL[q.type]}</Badge>
                  {q.chapter && <span className="text-xs text-muted-foreground">{q.chapter}</span>}
                  <span className="text-xs text-muted-foreground">难度 {q.difficulty}</span>
                </div>
                <p className="truncate">{q.stem}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => openEdit(q)}>编辑</Button>
                <Button variant="ghost" size="sm" onClick={() => del(q)}>删除</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">暂无题目</p>}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "编辑题目" : "新建题目"} className="max-w-lg">
        {form && <QForm form={form} setForm={setForm} onSave={save} onCancel={() => setForm(null)} />}
      </Modal>
    </div>
  );
}

function QForm({ form, setForm, onSave, onCancel }: {
  form: FormState; setForm: (f: FormState) => void; onSave: () => void; onCancel: () => void;
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
      {/* PLACEHOLDER_DYNAMIC */}
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
        <div className="space-y-1.5"><Label>章节</Label><Input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} /></div>
        <div className="space-y-1.5">
          <Label>难度</Label>
          <Select value={String(form.difficulty)} onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </div>
      </div>
      <div className="space-y-1.5"><Label>知识点标签（逗号分隔）</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>解析</Label><Textarea value={form.analysis} onChange={(e) => setForm({ ...form, analysis: e.target.value })} /></div>
      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" onClick={onCancel}>取消</Button>
        <Button onClick={onSave}>保存</Button>
      </div>
    </div>
  );
}
