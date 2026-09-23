"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Send } from "lucide-react";
import { api } from "@/lib/client/fetcher";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SectionLabel } from "@/components/ui/bento";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };
const SUGGESTIONS = ["什么是牛顿第一定律？", "怎么区分重力和质量？", "帮我理清串联和并联电路的区别", "浮力的公式是怎么推出来的？"];

export default function AssistantPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const r = await api<{ reply: string }>("/api/student/assistant", { method: "POST", body: JSON.stringify({ messages: next }) });
      setMsgs([...next, { role: "assistant", content: r.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "请求失败");
      setMsgs(next); // 保留用户问题，方便重发
    } finally { setLoading(false); }
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col">
      <SectionLabel>AI 学习助手 · 物理小助手</SectionLabel>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-3xl border bg-card p-4 shadow-soft">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="grad-violet flex h-14 w-14 items-center justify-center rounded-2xl shadow-soft">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <p className="text-sm text-muted-foreground">问我任何八年级物理问题，我会一步步帮你理解～</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="soft-violet rounded-full px-3 py-1.5 text-xs font-medium">{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
              m.role === "user" ? "grad-violet text-white" : "bg-secondary")}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div className="flex justify-start"><div className="rounded-2xl bg-secondary px-3.5 py-2.5 text-sm text-muted-foreground">思考中…</div></div>}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex items-end gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="输入你的物理问题…（Enter 发送，Shift+Enter 换行）"
          className="min-h-[44px] flex-1"
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()} aria-label="发送"><Send className="h-5 w-5" /></Button>
      </form>
    </div>
  );
}
