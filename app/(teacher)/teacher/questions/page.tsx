"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { QuestionForm, buildPayload, emptyForm, formFromQuestion, TYPE_LABEL, type FormState, type QType } from "@/components/question-form";

type Question = {
  id: number; type: QType; stem: string; optionsJson: string | null; answerJson: string | null;
  analysis: string | null; knowledgeTagsJson: string; chapter: string | null; difficulty: number;
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={fType} onChange={(e) => setFType(e.target.value)} className="w-32">
          <option value="">全部题型</option>
          {(Object.keys(TYPE_LABEL) as QType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </Select>
        <Input value={fChapter} onChange={(e) => setFChapter(e.target.value)} placeholder="按章节过滤" className="w-40" />
        <div className="ml-auto"><Button onClick={() => setForm({ ...emptyForm })}>新建题目</Button></div>
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
                <Button variant="outline" size="sm" onClick={() => setForm(formFromQuestion(q))}>编辑</Button>
                <Button variant="ghost" size="sm" onClick={() => del(q)}>删除</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">暂无题目</p>}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "编辑题目" : "新建题目"} className="max-w-lg">
        {form && <QuestionForm form={form} setForm={setForm} onSave={save} onCancel={() => setForm(null)} />}
      </Modal>
    </div>
  );
}
