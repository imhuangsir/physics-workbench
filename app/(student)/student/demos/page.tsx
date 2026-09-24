"use client";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/bento";
import { FadeIn } from "@/components/motion/fade-in";
import { ChapterMotif } from "@/components/demos/ChapterMotif";

const CHAPTERS = [
  { n: 1, title: "机械运动", href: "/student/demos/ch1", tone: "soft-violet", ready: true, sub: "参照物 · 匀速与变速 · 刻度尺读数" },
  { n: 2, title: "声现象", href: "/student/demos/ch2", tone: "soft-blue", ready: true, sub: "振动发声 · 传播 · 音调响度音色" },
  { n: 3, title: "物态变化", href: "/student/demos/ch3", tone: "soft-emerald", ready: true, sub: "熔化沸腾 · 汽化液化 · 升华凝华" },
  { n: 4, title: "光现象", href: "/student/demos/ch4", tone: "soft-amber", ready: true, sub: "反射 · 折射 · 平面镜成像" },
  { n: 5, title: "透镜及其应用", href: "/student/demos/ch5", tone: "soft-rose", ready: true, sub: "凸透镜成像规律 · 眼睛与相机" },
  { n: 6, title: "质量与密度", href: "/student/demos/ch6", tone: "soft-violet", ready: true, sub: "质量 · 密度 · 测量" },
];

export default function DemosIndex() {
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>物理演示 · 交互动画</SectionLabel>
        <p className="text-sm text-muted-foreground">按章节看物理现象的动画，拖一拖、点一点，边玩边理解。</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHAPTERS.map((c, i) => {
          const inner = (
            <div className={`relative flex h-full min-h-[128px] flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-soft ${c.tone} ${c.ready ? "transition hover:opacity-95" : "opacity-60"}`}>
              <ChapterMotif n={c.n} className="pointer-events-none absolute -bottom-4 -right-3 h-28 w-28 opacity-20" />
              <div className="relative flex items-center justify-between">
                <span className="text-sm font-semibold opacity-90">第 {c.n} 章</span>
                <ChapterMotif n={c.n} className="h-6 w-6 opacity-80" />
              </div>
              <div className="relative">
                <div className="text-xl font-extrabold tracking-tight">{c.title}</div>
                <div className="mt-1 text-xs opacity-90">{c.sub}</div>
                {!c.ready && <div className="mt-2 text-xs font-semibold">即将上线</div>}
              </div>
            </div>
          );
          return (
            <FadeIn key={c.n} delay={i * 0.05}>
              {c.ready && c.href ? <Link href={c.href}>{inner}</Link> : inner}
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}
