"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { api } from "@/lib/client/fetcher";
import { FadeIn } from "@/components/motion/fade-in";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/bento";

type Item = { id: number; title: string; dueAt: number | null; status: "not_started" | "submitted" | "graded" };
type Ann = { id: number; title: string; body: string; createdAt: number };

const STATUS: Record<Item["status"], { label: string; variant: "neutral" | "warning" | "success" }> = {
  not_started: { label: "未开始", variant: "neutral" },
  submitted: { label: "已提交", variant: "warning" },
  graded: { label: "已批改", variant: "success" },
};

function fmtDue(due: number | null): string {
  if (!due) return "无截止时间";
  return "截止 " + new Date(due * 1000).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function StudentHome() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [anns, setAnns] = useState<Ann[]>([]);

  useEffect(() => {
    api<Item[]>("/api/student/assignments")
      .then(setItems)
      .catch((e) => { setItems([]); toast.error(e instanceof Error ? e.message : "加载失败"); });
    api<Ann[]>("/api/student/announcements").then(setAnns).catch(() => {});
  }, []);

  function open(it: Item) {
    if (it.status === "not_started") router.push(`/student/assignments/${it.id}`);
    else router.push(`/student/assignments/${it.id}/result`);
  }

  return (
    <div className="space-y-6">
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
            {items.map((it, i) => (
              <FadeIn key={it.id} delay={i * 0.04}>
                <Card
                  role="button"
                  tabIndex={0}
                  onClick={() => open(it)}
                  onKeyDown={(e) => { if (e.key === "Enter") open(it); }}
                  className="cursor-pointer transition-shadow hover:shadow-lift"
                >
                  <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                    <CardTitle className="text-base">{it.title}</CardTitle>
                    <Badge variant={STATUS[it.status].variant}>{STATUS[it.status].label}</Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{fmtDue(it.dueAt)}</CardContent>
                </Card>
              </FadeIn>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
