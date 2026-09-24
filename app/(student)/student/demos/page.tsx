"use client";
import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";

const CHAPTERS = [
  { n: 1, title: "机械运动", href: "/student/demos/ch1", tone: "soft-violet", ready: true, sub: "参照物 · 匀速与变速 · 刻度尺读数" },
  { n: 2, title: "声现象", tone: "soft-blue", ready: false, sub: "振动发声 · 传播 · 音调响度音色" },
  { n: 3, title: "物态变化", tone: "soft-emerald", ready: false, sub: "熔化沸腾 · 汽化液化 · 升华凝华" },
  { n: 4, title: "光现象", tone: "soft-amber", ready: false, sub: "反射 · 折射 · 平面镜成像" },
  { n: 5, title: "透镜及其应用", tone: "soft-rose", ready: false, sub: "凸透镜成像规律 · 眼睛与相机" },
  { n: 6, title: "质量与密度", tone: "soft-violet", ready: false, sub: "质量 · 密度 · 测量" },
];

export default function DemosIndex() {
  return (
    <div className="space-y-6">
      <div>
        <SectionLabel>物理演示 · 交互动画</SectionLabel>
        <p className="text-sm text-muted-foreground">按章节看物理现象的动画，拖一拖、点一点，边玩边理解。</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CHAPTERS.map((c) => {
          const inner = (
            <div className={`flex h-full min-h-[128px] flex-col justify-between rounded-3xl p-5 shadow-soft ${c.tone} ${c.ready ? "transition hover:opacity-95" : "opacity-60"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold opacity-90">第 {c.n} 章</span>
                <FlaskConical className="h-5 w-5 opacity-80" />
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight">{c.title}</div>
                <div className="mt-1 text-xs opacity-90">{c.sub}</div>
                {!c.ready && <div className="mt-2 text-xs font-semibold">即将上线</div>}
              </div>
            </div>
          );
          return c.ready && c.href
            ? <Link key={c.n} href={c.href}>{inner}</Link>
            : <div key={c.n}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
