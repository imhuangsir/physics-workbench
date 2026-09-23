"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

type ClassRow = { id: number; name: string; count: number };
type Student = { id: number; name: string; dedupLabel: string; status: "active" | "disabled"; loginVersion: number; classId: number };
type LoginLog = { id: number; ip: string | null; ua: string | null; createdAt: number };

export default function RosterPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [newClass, setNewClass] = useState("");
  const [importText, setImportText] = useState("");
  const [importReport, setImportReport] = useState<{ inserted: number; duplicates: string[] } | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);
  const [logsFor, setLogsFor] = useState<Student | null>(null);
  const [logs, setLogs] = useState<LoginLog[]>([]);

  function loadClasses() {
    api<ClassRow[]>("/api/teacher/classes").then(setClasses).catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
  }
  function loadStudents(classId: number) {
    api<Student[]>(`/api/teacher/students?classId=${classId}`).then(setStudents).catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
  }
  useEffect(loadClasses, []);
  useEffect(() => { if (selected) loadStudents(selected); }, [selected]);

  async function createClass() {
    if (!newClass.trim()) return toast.error("请输入班级名");
    try {
      await api("/api/teacher/classes", { method: "POST", body: JSON.stringify({ name: newClass.trim() }) });
      setNewClass(""); toast.success("已创建班级"); loadClasses();
    } catch (e) { toast.error(e instanceof Error ? e.message : "创建失败"); }
  }

  async function doImport() {
    if (!selected) return toast.error("请先选择班级");
    const names = importText.split("\n").map((s) => s.trim()).filter(Boolean);
    if (names.length === 0) return toast.error("请输入至少一个姓名");
    try {
      const r = await api<{ inserted: number; duplicates: string[] }>("/api/teacher/students/import",
        { method: "POST", body: JSON.stringify({ classId: selected, names }) });
      setImportReport(r); setImportText(""); toast.success(`导入完成：新增 ${r.inserted} 人`);
      loadStudents(selected); loadClasses();
    } catch (e) { toast.error(e instanceof Error ? e.message : "导入失败"); }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      await api(`/api/teacher/students/${editing.id}`, { method: "PATCH",
        body: JSON.stringify({ name: editing.name, dedupLabel: editing.dedupLabel }) });
      toast.success("已保存"); setEditing(null); if (selected) loadStudents(selected);
    } catch (e) { toast.error(e instanceof Error ? e.message : "保存失败"); }
  }

  async function toggleStatus(s: Student) {
    try {
      await api(`/api/teacher/students/${s.id}`, { method: "PATCH",
        body: JSON.stringify({ status: s.status === "active" ? "disabled" : "active" }) });
      if (selected) loadStudents(selected);
    } catch (e) { toast.error(e instanceof Error ? e.message : "操作失败"); }
  }

  async function revoke(s: Student) {
    if (!confirm(`确定清除 ${s.name} 的登录态？该生需重新登录。`)) return;
    try {
      await api(`/api/teacher/students/${s.id}/revoke`, { method: "POST" });
      toast.success("已清除登录态"); if (selected) loadStudents(selected);
    } catch (e) { toast.error(e instanceof Error ? e.message : "操作失败"); }
  }

  async function viewLogins(s: Student) {
    setLogsFor(s); setLogs([]);
    try { setLogs(await api<LoginLog[]>(`/api/teacher/students/${s.id}/logins`)); }
    catch (e) { toast.error(e instanceof Error ? e.message : "加载失败"); }
  }

  // PLACEHOLDER_JSX
  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card>
          <CardHeader><CardTitle className="text-base">班级</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input value={newClass} onChange={(e) => setNewClass(e.target.value)} placeholder="新班级名" />
              <Button onClick={createClass}>建班</Button>
            </div>
            <ul className="space-y-1">
              {classes.map((c) => (
                <li key={c.id}>
                  <button onClick={() => { setSelected(c.id); setImportReport(null); }}
                    className={"flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm " +
                      (selected === c.id ? "bg-primary/10 text-primary" : "hover:bg-accent")}>
                    <span>{c.name}</span>
                    <Badge variant="neutral">{c.count} 人</Badge>
                  </button>
                </li>
              ))}
              {classes.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">暂无班级</li>}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {selected ? (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">批量导入名单</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Textarea value={importText} onChange={(e) => setImportText(e.target.value)}
                    placeholder="每行一个姓名" className="min-h-[96px]" />
                  <Button onClick={doImport}>导入到当前班级</Button>
                  {importReport && (
                    <p className="text-sm text-muted-foreground">
                      新增 {importReport.inserted} 人
                      {importReport.duplicates.length > 0 && `；重复跳过：${importReport.duplicates.join("、")}`}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">学生（{students.length}）</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {students.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{s.name}{s.dedupLabel ? `(${s.dedupLabel})` : ""}</span>
                        {s.status === "disabled" && <Badge variant="warning">已停用</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button variant="outline" size="sm" onClick={() => setEditing({ ...s })}>编辑</Button>
                        <Button variant="outline" size="sm" onClick={() => toggleStatus(s)}>{s.status === "active" ? "停用" : "启用"}</Button>
                        <Button variant="ghost" size="sm" onClick={() => viewLogins(s)}>登录记录</Button>
                        <Button variant="ghost" size="sm" onClick={() => revoke(s)}>清除登录态</Button>
                      </div>
                    </div>
                  ))}
                  {students.length === 0 && <p className="text-sm text-muted-foreground">该班暂无学生</p>}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">请选择左侧班级查看名单。</CardContent></Card>
          )}
        </div>
      </section>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="编辑学生">
        {editing && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>姓名</Label>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>同名区分标签（如 1、2）</Label>
              <Input value={editing.dedupLabel} onChange={(e) => setEditing({ ...editing, dedupLabel: e.target.value })} placeholder="留空表示无" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
              <Button onClick={saveEdit}>保存</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!logsFor} onClose={() => setLogsFor(null)} title={`登录记录 · ${logsFor?.name ?? ""}`}>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {logs.map((l) => (
            <div key={l.id} className="rounded-lg border p-2 text-xs">
              <div>{new Date(l.createdAt * 1000).toLocaleString("zh-CN")}</div>
              <div className="text-muted-foreground">IP：{l.ip ?? "—"}</div>
              <div className="truncate text-muted-foreground">UA：{l.ua ?? "—"}</div>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-muted-foreground">暂无登录记录</p>}
        </div>
      </Modal>
    </div>
  );
}
