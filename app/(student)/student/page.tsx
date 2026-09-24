"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone, ArrowRight } from "lucide-react";
import { api } from "@/lib/client/fetcher";
import { getSession } from "@/lib/client/auth";
import { FadeIn } from "@/components/motion/fade-in";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionLabel, StatTile } from "@/components/ui/bento";

type Item = { id: number; title: string; dueAt: number | null; status: "not_started" | "submitted" | "graded" };
type Ann = { id: number; title: string; body: string; createdAt: number };

const STATUS: Record<Item["status"], { label: string; variant: "neutral" | "warning" | "success" }> = {
  not_started: { label: "未开始", variant: "neutral" },
  submitted: { label: "已提交", variant: "warning" },
  graded: { label: "已批改", variant: "success" },
};

function dueInfo(it: Item): { text: string; cls: string } {
  if (it.status !== "not_started") {
    return { text: it.dueAt ? "截止 " + fmt(it.dueAt) : "无截止时间", cls: "text-muted-foreground" };
  }
  if (!it.dueAt) return { text: "无截止时间", cls: "text-muted-foreground" };
  const diff = it.dueAt - Date.now() / 1000;
  if (diff < 0) return { text: "已逾期 · " + fmt(it.dueAt), cls: "font-medium text-rose-500" };
  if (diff < 86400) return { text: "24 小时内截止 · " + fmt(it.dueAt), cls: "font-medium text-amber-600 dark:text-amber-400" };
  if (diff < 3 * 86400) return { text: "3 天内截止 · " + fmt(it.dueAt), cls: "font-medium text-amber-600 dark:text-amber-400" };
  return { text: "截止 " + fmt(it.dueAt), cls: "text-muted-foreground" };
}
function fmt(due: number): string {
  return new Date(due * 1000).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function sortItems(a: Item, b: Item): number {
  const rank = (x: Item) => (x.status === "not_started" ? 0 : x.status === "submitted" ? 1 : 2);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  return (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity);
}

export default function StudentHome() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [anns, setAnns] = useState<Ann[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    setName(getSession()?.student?.name ?? "");
    api<Item[]>("/api/student/assignments").then((d) => setItems([...d].sort(sortItems)))
      .catch((e) => { setItems([]); toast.error(e instanceof Error ? e.message : "加载失败"); });
    api<Ann[]>("/api/student/announcements").then(setAnns).catch(() => {});
  }, []);

  function open(it: Item) {
    router.push(it.status === "not_started" ? `/student/assignments/${it.id}` : `/student/assignments/${it.id}/result`);
  }

  const pending = items?.filter((i) => i.status === "not_started").length ?? 0;
  const done = items?.filter((i) => i.status !== "not_started").length ?? 0;
  const urgent = items?.filter((i) => i.status === "not_started" && i.dueAt != null && i.dueAt - Date.now() / 1000 < 86400).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Bento 概览 */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <FadeIn>
          <div className="grad-violet flex min-h-[132px] flex-col justify-between rounded-3xl p-6 shadow-soft sm:col-span-2">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">你好{name ? `，${name}` : ""} 👋</h2>
              <p className="mt-1 text-sm text-white/90">{pending > 0 ? `还有 ${pending} 份作业待完成，加油！` : "作业都完成啦，去看看学习报告吧～"}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold">
              {urgent > 0 ? `${urgent} 份即将截止` : "保持节奏"} <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </FadeIn>
        <FadeIn delay={0.05}><StatTile tone="violet" value={pending} label="待完成" className="min-h-[132px] flex flex-col justify-center" /></FadeIn>
        <FadeIn delay={0.1}><StatTile tone="emerald" value={done} label="已完成" className="min-h-[132px] flex flex-col justify-center" /></FadeIn>
      </div>

      {anns.length > 0 && (
        <section>
          <SectionLabel>公告</SectionLabel>
          <div className="space-y-2">
            {anns.slice(0, 5).map((a) => (
              <div key={a.id} className="soft-amber flex gap-3 rounded-2xl p-4">
                <Megaphone className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold">{a.title}</p>
                  {a.body && <p className="whitespace-pre-wrap text-sm opacity-90">{a.body}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionLabel>我的作业</SectionLabel>
        {items === null ? (
          <p className="text-muted-foreground">加载中…</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">暂无作业。</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it, i) => {
              const d = dueInfo(it);
              return (
                <FadeIn key={it.id} delay={i * 0.04}>
                  <Card role="button" tabIndex={0} onClick={() => open(it)}
                    onKeyDown={(e) => { if (e.key === "Enter") open(it); }}
                    className="cursor-pointer transition-shadow hover:shadow-lift">
                    <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                      <CardTitle className="text-base">{it.title}</CardTitle>
                      <Badge variant={STATUS[it.status].variant}>{STATUS[it.status].label}</Badge>
                    </CardHeader>
                    <CardContent className={"text-sm " + d.cls}>{d.text}</CardContent>
                  </Card>
                </FadeIn>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
