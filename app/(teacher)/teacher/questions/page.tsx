"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { api } from "@/lib/client/fetcher";
import { useChapters } from "@/components/chapter-select";
import { UNCATEGORIZED, bucketOf } from "@/lib/chapters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { QuestionForm, buildPayload, emptyForm, formFromQuestion, TYPE_LABEL, type FormState, type QType } from "@/components/question-form";

type Question = {
  id: number; type: QType; stem: string; optionsJson: string | null; answerJson: string | null;
  analysis: string | null; knowledgeTagsJson: string; chapter: string | null; difficulty: number;
};
const TONES = ["soft-violet", "soft-blue", "soft-emerald", "soft-amber", "soft-rose"];

export default function QuestionsPage() {
  const { all } = useChapters();
  const [list, setList] = useState<Question[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [fType, setFType] = useState<QType | "">("");
  const [form, setForm] = useState<FormState | null>(null);

  function load() {
    api<Question[]>("/api/teacher/questions").then(setList).catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
  }
  useEffect(load, []);

  const known = useMemo(() => new Set(all), [all]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const q of list) { const b = bucketOf(q.chapter, known); m[b] = (m[b] ?? 0) + 1; }
    return m;
  }, [list, known]);
  const cards = useMemo(() => {
    const cs = all.map((name) => ({ name, count: counts[name] ?? 0 }));
    if ((counts[UNCATEGORIZED] ?? 0) > 0) cs.push({ name: UNCATEGORIZED, count: counts[UNCATEGORIZED] });
    return cs;
  }, [all, counts]);
  const selList = useMemo(
    () => (sel == null ? [] : list.filter((q) => bucketOf(q.chapter, known) === sel && (!fType || q.type === fType))),
    [sel, list, known, fType],
  );

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
  const newInChapter = () => setForm({ ...emptyForm, chapter: sel && sel !== UNCATEGORIZED ? sel : "" });

  return (
    <div className="space-y-4">
      {sel == null ? (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">题库 · 按章节</h1>
            <Button onClick={() => setForm({ ...emptyForm })}>新建题目</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c, i) => (
              <button key={c.name} onClick={() => { setSel(c.name); setFType(""); }}
                className={`flex min-h-[104px] flex-col justify-between rounded-3xl p-5 text-left shadow-soft transition hover:opacity-95 ${TONES[i % TONES.length]}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold opacity-90">{c.name}</span>
                  <FlaskConical className="h-5 w-5 opacity-80" />
                </div>
                <div className="num text-2xl font-extrabold tracking-tight">{c.count} <span className="text-sm font-medium opacity-80">题</span></div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setSel(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> 全部章节
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">{sel}</h1>
            <div className="ml-auto"><Button onClick={newInChapter}>新建题目</Button></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={fType === "" ? "default" : "outline"} onClick={() => setFType("")}>全部题型</Button>
            {(Object.keys(TYPE_LABEL) as QType[]).map((t) => (
              <Button key={t} size="sm" variant={fType === t ? "default" : "outline"} onClick={() => setFType(t)}>{TYPE_LABEL[t]}</Button>
            ))}
          </div>
          <div className="space-y-2">
            {selList.map((q) => (
              <Card key={q.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="neutral">{TYPE_LABEL[q.type]}</Badge>
                      <span className="text-xs text-muted-foreground">难度 {q.difficulty}</span>
                    </div>
                    <p className="truncate">{q.stem}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setForm(formFromQuestion(q))}>编辑</Button>
                    <Button variant="ghost" size="sm" onClick={() => del(q)}>删除</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {selList.length === 0 && <p className="text-sm text-muted-foreground">该章节下暂无{fType ? TYPE_LABEL[fType] : ""}题目</p>}
          </div>
        </>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "编辑题目" : "新建题目"} className="max-w-lg">
        {form && <QuestionForm form={form} setForm={setForm} onSave={save} onCancel={() => setForm(null)} />}
      </Modal>
    </div>
  );
}
