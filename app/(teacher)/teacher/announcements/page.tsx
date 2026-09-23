"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/bento";

type ClassRow = { id: number; name: string; count: number };
type Ann = { id: number; title: string; body: string; classId: number | null; className: string; createdAt: number };

export default function AnnouncementsPage() {
  const [list, setList] = useState<Ann[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [classId, setClassId] = useState("");

  function load() {
    api<Ann[]>("/api/teacher/announcements").then(setList).catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
  }
  useEffect(() => {
    load();
    api<ClassRow[]>("/api/teacher/classes").then(setClasses).catch(() => {});
  }, []);

  async function publish() {
    if (!title.trim()) return toast.error("请填写标题");
    try {
      await api("/api/teacher/announcements", { method: "POST", body: JSON.stringify({
        title: title.trim(), body: body.trim(), classId: classId ? Number(classId) : null,
      }) });
      setTitle(""); setBody(""); setClassId(""); toast.success("已发布"); load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "发布失败"); }
  }

  async function remove(id: number) {
    if (!confirm("确定删除该公告？")) return;
    try { await api(`/api/teacher/announcements/${id}`, { method: "DELETE" }); toast.success("已删除"); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "删除失败"); }
  }

  return (
    <div className="space-y-5">
      <SectionLabel>公告 · 发布与管理</SectionLabel>

      <Card>
        <CardHeader><CardTitle className="text-base">发布公告</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5"><Label>标题</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>内容</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="选填" /></div>
          <div className="space-y-1.5">
            <Label>发布范围</Label>
            <Select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-48">
              <option value="">全体班级</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
          <Button onClick={publish}>发布</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {list.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant={a.classId == null ? "info" : "neutral"}>{a.className}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(a.createdAt * 1000).toLocaleString("zh-CN")}</span>
                </div>
                <p className="font-medium">{a.title}</p>
                {a.body && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>删除</Button>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">暂无公告</p>}
      </div>
    </div>
  );
}
