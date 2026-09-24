"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { DemoCard } from "@/components/demos/DemoCard";
import { LensRaysDemo } from "@/components/demos/LensRaysDemo";
import { LifeLensesDemo } from "@/components/demos/LifeLensesDemo";
import { ConvexImagingDemo } from "@/components/demos/ConvexImagingDemo";
import { EyeCorrectionDemo } from "@/components/demos/EyeCorrectionDemo";
import { TelescopeMicroscopeDemo } from "@/components/demos/TelescopeMicroscopeDemo";

function Sec({ children }: { children: React.ReactNode }) {
  return <div className="pt-1 text-sm font-bold text-foreground/70">{children}</div>;
}

export default function Chapter5Demos() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/student/demos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 全部章节
        </Link>
        <SectionLabel className="mt-2">第 5 章 · 透镜及其应用</SectionLabel>
        <p className="text-sm text-muted-foreground">透镜、生活中的透镜、凸透镜成像的规律、眼睛和眼镜、显微镜和望远镜。</p>
      </div>

      <Sec>第 1 节 · 透镜</Sec>
      <DemoCard title="透镜对光的作用" tag="会聚 / 发散" desc="切换凸透镜和凹透镜，看平行光通过后怎么走。">
        <LensRaysDemo />
      </DemoCard>

      <Sec>第 2 节 · 生活中的透镜</Sec>
      <DemoCard title="照相机 · 投影仪 · 放大镜" tag="凸透镜的应用" desc="切换三种器件，看各自成什么样的像。">
        <LifeLensesDemo />
      </DemoCard>

      <Sec>第 3 节 · 凸透镜成像的规律</Sec>
      <DemoCard title="凸透镜成像规律" tag="物距决定成像" desc="拖动物距，看成的像是放大还是缩小、正立还是倒立、实像还是虚像。">
        <ConvexImagingDemo />
      </DemoCard>

      <Sec>第 4 节 · 眼睛和眼镜</Sec>
      <DemoCard title="眼睛与视力矫正" tag="近视 / 远视" desc="切换正常/近视/远视，戴上矫正眼镜看焦点怎么回到视网膜。">
        <EyeCorrectionDemo />
      </DemoCard>

      <Sec>第 5 节 · 显微镜和望远镜</Sec>
      <DemoCard title="显微镜与望远镜" tag="两组透镜 · 两次放大" desc="切换显微镜/望远镜，看物镜成像、目镜再放大。">
        <TelescopeMicroscopeDemo />
      </DemoCard>
    </div>
  );
}
