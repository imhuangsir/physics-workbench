"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { StackGame } from "@/components/games/StackGame";
import { GravityRunGame } from "@/components/games/GravityRunGame";
import { ShellGame } from "@/components/games/ShellGame";
import { JumpGame } from "@/components/games/JumpGame";
import { Game2048 } from "@/components/games/Game2048";

const GAMES = [
  { key: "stack", title: "叠叠高", sub: "随机宽窄 · 靠重心叠高", tone: "soft-violet", C: StackGame },
  { key: "run", title: "重力翻转跑酷", sub: "翻转重力 · 越跑越快", tone: "soft-blue", C: GravityRunGame },
  { key: "shell", title: "椰子壳猜球", sub: "记住小球 · 越洗越快", tone: "soft-amber", C: ShellGame },
  { key: "jump", title: "弹跳上升", sub: "随机踏板 · 越跳越高", tone: "soft-emerald", C: JumpGame },
  { key: "2048", title: "2048 合并", sub: "合并数字 · 烧脑不腻", tone: "soft-rose", C: Game2048 },
];

export default function GamesPage() {
  const [sel, setSel] = useState<number | null>(null);
  const Active = sel != null ? GAMES[sel].C : null;

  return (
    <div className="space-y-4">
      {sel == null ? (
        <>
          <div>
            <Link href="/student/tools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> 实用小工具</Link>
            <SectionLabel className="mt-2">小游戏</SectionLabel>
            <p className="text-sm text-muted-foreground">都是随机生成、比高分的小游戏，越玩越难，玩不腻。</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.map((g, i) => (
              <button key={g.key} onClick={() => setSel(i)} className={`flex min-h-[112px] flex-col justify-between rounded-3xl p-5 text-left shadow-soft transition hover:opacity-95 ${g.tone}`}>
                <span className="text-sm font-semibold opacity-90">🎮 小游戏</span>
                <div><div className="text-xl font-extrabold tracking-tight">{g.title}</div><div className="mt-1 text-xs opacity-90">{g.sub}</div></div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setSel(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> 选择小游戏</button>
          <h1 className="text-lg font-semibold">{GAMES[sel].title}</h1>
          {Active && <Active />}
        </>
      )}
    </div>
  );
}
