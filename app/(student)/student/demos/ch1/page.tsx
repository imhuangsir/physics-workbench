"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { DemoCard } from "@/components/demos/DemoCard";
import { ReferenceFrameDemo } from "@/components/demos/ReferenceFrameDemo";
import { MotionTypesDemo } from "@/components/demos/MotionTypesDemo";
import { RulerReadingDemo } from "@/components/demos/RulerReadingDemo";

export default function Chapter1Demos() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/student/demos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 全部章节
        </Link>
        <SectionLabel className="mt-2">第 1 章 · 机械运动</SectionLabel>
        <p className="text-sm text-muted-foreground">运动的描述、参照物、匀速与变速、长度测量与误差。</p>
      </div>

      <DemoCard title="参照物与相对运动" tag="运动的描述" desc="选择不同的参照物，看看同一辆车是「运动」还是「静止」。">
        <ReferenceFrameDemo />
      </DemoCard>

      <DemoCard title="匀速直线运动 vs 变速直线运动" tag="运动的图像 · 速度" desc="对比每秒落点的疏密，以及 s-t 图像是直线还是曲线。">
        <MotionTypesDemo />
      </DemoCard>

      <DemoCard title="刻度尺读数与估读" tag="长度测量 · 误差" desc="拖动物体长度，理解分度值、估读和测量误差。">
        <RulerReadingDemo />
      </DemoCard>
    </div>
  );
}
