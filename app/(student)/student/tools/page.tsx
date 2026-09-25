"use client";
import Link from "next/link";
import { BookOpen, Calculator, Gamepad2 } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { FadeIn } from "@/components/motion/fade-in";

const TOOLS = [
  { href: "/student/tools/formulas", title: "公式速查", sub: "八上公式 · 单位 · 常数卡片", tone: "soft-violet", Icon: BookOpen },
  { href: "/student/tools/converter", title: "单位换算器", sub: "长度 / 质量 / 速度 / 密度…", tone: "soft-blue", Icon: Calculator },
  { href: "/student/tools/games", title: "小游戏", sub: "边玩边练 · 越玩越难", tone: "soft-amber", Icon: Gamepad2 },
];

export default function ToolsIndex() {
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>实用小工具</SectionLabel>
        <p className="text-sm text-muted-foreground">查公式、换单位，累了来玩两局物理小游戏。</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t, i) => (
          <FadeIn key={t.href} delay={i * 0.05}>
            <Link href={t.href} className={`relative flex min-h-[128px] flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-soft transition hover:opacity-95 ${t.tone}`}>
              <t.Icon className="pointer-events-none absolute -bottom-4 -right-3 h-24 w-24 opacity-15" />
              <div className="relative flex items-center justify-between">
                <span className="text-sm font-semibold opacity-90">工具</span>
                <t.Icon className="h-6 w-6 opacity-80" />
              </div>
              <div className="relative">
                <div className="text-xl font-extrabold tracking-tight">{t.title}</div>
                <div className="mt-1 text-xs opacity-90">{t.sub}</div>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
