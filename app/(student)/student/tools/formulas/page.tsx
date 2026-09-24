"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { FadeIn } from "@/components/motion/fade-in";

const SHEETS: { chapter: string; tone: string; items: { f: string; note?: string }[] }[] = [
  { chapter: "第1章 机械运动", tone: "soft-violet", items: [
    { f: "速度 v = s / t", note: "s 路程(m)，t 时间(s)，v(m/s)" },
    { f: "1 m/s = 3.6 km/h" },
    { f: "刻度尺要估读到分度值的下一位" },
  ] },
  { chapter: "第2章 声现象", tone: "soft-blue", items: [
    { f: "声速 v ≈ 340 m/s", note: "15℃ 空气中；固体>液体>气体" },
    { f: "回声测距 s = ½ v t" },
    { f: "音调↔频率，响度↔振幅，音色↔波形" },
    { f: "人耳听觉范围 20 Hz ~ 20000 Hz" },
  ] },
  { chapter: "第3章 物态变化", tone: "soft-emerald", items: [
    { f: "冰水混合物 0℃，标准大气压下沸水 100℃" },
    { f: "吸热：熔化、汽化、升华" },
    { f: "放热：凝固、液化、凝华" },
  ] },
  { chapter: "第4章 光现象", tone: "soft-amber", items: [
    { f: "光速 c = 3×10⁸ m/s", note: "真空/空气中" },
    { f: "反射角 = 入射角" },
    { f: "平面镜像：等大、等距、虚像、左右相反" },
    { f: "空气斜射入水：折射角 < 入射角" },
  ] },
  { chapter: "第5章 透镜及其应用", tone: "soft-rose", items: [
    { f: "一倍焦距分虚实，二倍焦距分大小", note: "凸透镜成像口诀" },
    { f: "u>2f 倒立缩小实像（照相机）" },
    { f: "f<u<2f 倒立放大实像（投影仪）" },
    { f: "u<f 正立放大虚像（放大镜）" },
  ] },
  { chapter: "第6章 质量与密度", tone: "soft-violet", items: [
    { f: "密度 ρ = m / V", note: "m(kg)，V(m³)，ρ(kg/m³)" },
    { f: "ρ水 = 1.0×10³ kg/m³ = 1 g/cm³" },
    { f: "1 g/cm³ = 1000 kg/m³" },
    { f: "天平：物体质量 = 砝码总质量 + 游码读数" },
  ] },
];

export default function FormulasPage() {
  return (
    <div className="space-y-4">
      <div>
        <Link href="/student/tools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> 实用小工具</Link>
        <SectionLabel className="mt-2">公式速查 · 知识卡片</SectionLabel>
        <p className="text-sm text-muted-foreground">八年级上册常用公式、单位与常数。</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {SHEETS.map((s, i) => (
          <FadeIn key={s.chapter} delay={i * 0.04}>
            <div className={`space-y-2 rounded-3xl p-5 shadow-soft ${s.tone}`}>
              <div className="text-sm font-extrabold tracking-tight">{s.chapter}</div>
              <ul className="space-y-1.5">
                {s.items.map((it, j) => (
                  <li key={j} className="text-sm">
                    <span className="font-semibold">{it.f}</span>
                    {it.note && <span className="ml-1 text-xs opacity-80">（{it.note}）</span>}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
