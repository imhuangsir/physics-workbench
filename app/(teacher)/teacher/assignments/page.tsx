"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

const TYPE_LABEL: Record<string, string> = { single: "单选", multi: "多选", fill: "填空", short: "简答" };
type Assignment = { id: number; title: string; dueAt: number | null };
type ClassRow = { id: number; name: string; count: number };
type Question = { id: number; type: string; stem: string; chapter: string | null };
type Picked = { questionId: number; score: number };

function fmtDue(due: number | null) {
  return due ? new Date(due * 1000).toLocaleString("zh-CN") : "无截止时间";
}

export default function AssignmentsPage() {
  const [list, setList] = useState<Assignment[]>([]);
  const [wizard, setWizard] = useState(false);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [classIds, setClassIds] = useState<number[]>([]);
  const [picked, setPicked] = useState<Picked[]>([]);

  function load() {
    api<Assignment[]>("/api/teacher/assignments").then(setList).catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
  }
  useEffect(load, []);

  function openWizard() {
    setTitle(""); setDue(""); setClassIds([]); setPicked([]); setWizard(true);
    api<ClassRow[]>("/api/teacher/classes").then(setClasses).catch(() => {});
    api<Question[]>("/api/teacher/questions").then(setQuestions).catch(() => {});
  }

  function togglePick(qid: number) {
    setPicked((p) => p.some((x) => x.questionId === qid) ? p.filter((x) => x.questionId !== qid) : [...p, { questionId: qid, score: 10 }]);
  }
  function setScore(qid: number, score: number) {
    setPicked((p) => p.map((x) => x.questionId === qid ? { ...x, score } : x));
  }
  function toggleClass(cid: number) {
    setClassIds((c) => c.includes(cid) ? c.filter((x) => x !== cid) : [...c, cid]);
  }

  async function create() {
    if (!title.trim()) return toast.error("请填写作业标题");
    if (classIds.length === 0) return toast.error("请至少分配一个班级");
    if (picked.length === 0) return toast.error("请至少选择一道题");
    const payload = {
      title: title.trim(),
      dueAt: due ? Math.floor(new Date(due).getTime() / 1000) : null,
      classIds,
      questions: picked.map((p, i) => ({ questionId: p.questionId, orderNo: i + 1, score: p.score })),
    };
    try {
      await api("/api/teacher/assignments", { method: "POST", body: JSON.stringify(payload) });
      toast.success("作业已创建"); setWizard(false); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "创建失败"); }
  }

  // PLACEHOLDER_JSX
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">作业</h1>
        <Button onClick={openWizard}>新建作业</Button>
      </div>

      <div className="space-y-2">
        {list.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{fmtDue(a.dueAt)}</p>
              </div>
              <Link href={`/teacher/assignments/${a.id}/stats`}>
                <Button variant="outline" size="sm">查看统计</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">暂无作业</p>}
      </div>

      <Modal open={wizard} onClose={() => setWizard(false)} title="新建作业" className="max-w-2xl">
        <div className="max-h-[72vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>标题</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>截止时间（可选）</Label><Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></div>
          </div>

          <div className="space-y-1.5">
            <Label>分配班级</Label>
            <div className="flex flex-wrap gap-2">
              {classes.map((c) => (
                <button key={c.id} type="button" onClick={() => toggleClass(c.id)}
                  className={"rounded-lg border px-3 py-1.5 text-sm " + (classIds.includes(c.id) ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent")}>
                  {c.name}
                </button>
              ))}
              {classes.length === 0 && <span className="text-sm text-muted-foreground">暂无班级</span>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>选题并设分值（勾选顺序即题号）</Label>
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
              {questions.map((q) => {
                const pk = picked.find((x) => x.questionId === q.id);
                return (
                  <div key={q.id} className="flex items-center gap-2">
                    <input type="checkbox" checked={!!pk} onChange={() => togglePick(q.id)} />
                    <Badge variant="neutral">{TYPE_LABEL[q.type] ?? q.type}</Badge>
                    <span className="min-w-0 flex-1 truncate text-sm">{q.stem}</span>
                    {pk && (
                      <Input type="number" min={0} value={pk.score} onChange={(e) => setScore(q.id, Number(e.target.value))} className="w-20" />
                    )}
                  </div>
                );
              })}
              {questions.length === 0 && <p className="text-sm text-muted-foreground">题库为空，请先到题库添加题目</p>}
            </div>
            <p className="text-xs text-muted-foreground">已选 {picked.length} 题</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setWizard(false)}>取消</Button>
            <Button onClick={create}>创建作业</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
