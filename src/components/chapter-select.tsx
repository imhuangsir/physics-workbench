"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { orderedChapters, UNCATEGORIZED } from "@/lib/chapters";

type Ch = { id: number; name: string; createdAt: number };
let cache: string[] | null = null; // 自建章节名(越新越前)，会话内缓存

/** 拉取章节并提供新建能力；all = 自建(越新越前)+内置6章。 */
export function useChapters() {
  const [custom, setCustom] = useState<string[]>(cache ?? []);
  useEffect(() => {
    api<Ch[]>("/api/teacher/chapters")
      .then((r) => { cache = r.map((c) => c.name); setCustom(cache); })
      .catch(() => {});
  }, []);
  async function create(name: string): Promise<string | null> {
    const n = name.trim();
    if (!n) return null;
    const c = await api<Ch>("/api/teacher/chapters", { method: "POST", body: JSON.stringify({ name: n }) });
    cache = [c.name, ...(cache ?? []).filter((x) => x !== c.name)];
    setCustom(cache);
    return c.name;
  }
  return { custom, all: orderedChapters(custom), create };
}

/** 章节下拉选择 + 内联新建章节。 */
export function ChapterSelect({ value, onChange, className }: { value: string; onChange: (v: string) => void; className?: string }) {
  const { all, create } = useChapters();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  async function add() {
    try {
      const n = await create(name);
      if (n) { onChange(n); setName(""); setAdding(false); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "新建失败"); }
  }

  if (adding) {
    return (
      <div className={"flex gap-2 " + (className ?? "")}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="新章节名，如 第7章 力" className="flex-1"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button type="button" size="sm" onClick={add}>添加</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>取消</Button>
      </div>
    );
  }
  return (
    <div className={"flex gap-2 " + (className ?? "")}>
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="flex-1">
        <option value="">{UNCATEGORIZED}</option>
        {all.map((c) => <option key={c} value={c}>{c}</option>)}
      </Select>
      <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>＋新建</Button>
    </div>
  );
}
