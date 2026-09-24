"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { DemoCard } from "@/components/demos/DemoCard";
import { ReferenceFrameDemo } from "@/components/demos/ReferenceFrameDemo";
import { MotionTypesDemo } from "@/components/demos/MotionTypesDemo";
import { RulerReadingDemo } from "@/components/demos/RulerReadingDemo";
import { AverageSpeedDemo } from "@/components/demos/AverageSpeedDemo";

function Sec({ children }: { children: React.ReactNode }) {
  return <div className="pt-1 text-sm font-bold text-foreground/70">{children}</div>;
}

export default function Chapter1Demos() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/student/demos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 全部章节
        </Link>
        <SectionLabel className="mt-2">第 1 章 · 机械运动</SectionLabel>
        <p className="text-sm text-muted-foreground">长度和时间的测量、运动的描述、运动的快慢、测量平均速度。</p>
      </div>

      <Sec>第 1 节 · 长度和时间的测量</Sec>
      <DemoCard title="刻度尺读数与估读" tag="长度测量 · 误差" desc="拖动物体长度，理解分度值、估读和测量误差。">
        <RulerReadingDemo />
      </DemoCard>

      <Sec>第 2 节 · 运动的描述</Sec>
      <DemoCard title="参照物与相对运动" tag="参照物" desc="切换参照物（地面/小车/云），看同一辆车是「运动」还是「静止」（循环播放）。">
        <ReferenceFrameDemo />
      </DemoCard>

      <Sec>第 3 节 · 运动的快慢</Sec>
      <DemoCard title="匀速 vs 变速直线运动" tag="速度 · 快慢变化" desc="盯着速度计：匀速的数字不变，变速(加速)的数字一路往上涨。">
        <MotionTypesDemo />
      </DemoCard>

      <Sec>第 4 节 · 测量平均速度</Sec>
      <DemoCard title="斜面测平均速度" tag="v = s / t" desc="小车滑下斜面，比较上半程、下半程和全程的平均速度。">
        <AverageSpeedDemo />
      </DemoCard>
    </div>
  );
}
