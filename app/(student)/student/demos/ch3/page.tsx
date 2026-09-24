"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { DemoCard } from "@/components/demos/DemoCard";
import { MeltingCurveDemo } from "@/components/demos/MeltingCurveDemo";
import { BoilingDemo } from "@/components/demos/BoilingDemo";
import { EvaporationDemo } from "@/components/demos/EvaporationDemo";
import { PhaseChangesDemo } from "@/components/demos/PhaseChangesDemo";

export default function Chapter3Demos() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/student/demos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 全部章节
        </Link>
        <SectionLabel className="mt-2">第 3 章 · 物态变化</SectionLabel>
        <p className="text-sm text-muted-foreground">熔化与凝固、汽化（沸腾与蒸发）与液化、升华与凝华，以及吸热放热。</p>
      </div>

      <DemoCard title="熔化与凝固曲线" tag="晶体 vs 非晶体" desc="点按钮切换，看加热过程中温度随时间怎么变。">
        <MeltingCurveDemo />
      </DemoCard>

      <DemoCard title="水的沸腾" tag="沸腾吸热·温度不变" desc="持续加热，看温度升到 100℃ 后不再上升，气泡上升变大。">
        <BoilingDemo />
      </DemoCard>

      <DemoCard title="影响蒸发快慢的因素" tag="温度 · 表面积 · 空气流速" desc="拖三个滑块，看蒸发速度和逃逸的水分子怎么变。">
        <EvaporationDemo />
      </DemoCard>

      <DemoCard title="六种物态变化总览" tag="吸热 / 放热" desc="点一个过程，看固/液/气之间怎么转变、是吸热还是放热。">
        <PhaseChangesDemo />
      </DemoCard>
    </div>
  );
}
