"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { DemoCard } from "@/components/demos/DemoCard";
import { BalanceDemo } from "@/components/demos/BalanceDemo";
import { DensityCompareDemo } from "@/components/demos/DensityCompareDemo";
import { DisplacementDemo } from "@/components/demos/DisplacementDemo";
import { DensityIdDemo } from "@/components/demos/DensityIdDemo";
import { SecLabel as Sec } from "@/components/demos/SecLabel";

export default function Chapter6Demos() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/student/demos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 全部章节
        </Link>
        <SectionLabel className="mt-2">第 6 章 · 质量与密度</SectionLabel>
        <p className="text-sm text-muted-foreground">质量、密度、测量物质的密度、密度与社会生活。</p>
      </div>

      <Sec>第 1 节 · 质量</Sec>
      <DemoCard title="用天平测质量" tag="砝码 + 游码" desc="加减砝码、移动游码，让横梁平衡，读出物体质量。">
        <BalanceDemo />
      </DemoCard>

      <Sec>第 2 节 · 密度</Sec>
      <DemoCard title="密度是物质的特性" tag="ρ = m / V" desc="相同体积、不同物质，质量差别很大——这就是密度不同。">
        <DensityCompareDemo />
      </DemoCard>

      <Sec>第 3 节 · 测量物质的密度</Sec>
      <DemoCard title="量筒排水法测体积" tag="V = V₂ − V₁" desc="把不规则物体浸没到量筒里，看水面升高多少。">
        <DisplacementDemo />
      </DemoCard>

      <Sec>第 4 节 · 密度与社会生活</Sec>
      <DemoCard title="用密度鉴别物质" tag="ρ = m / V 查表" desc="测出 m 和 V 算密度，对照密度表判断是什么材料。">
        <DensityIdDemo />
      </DemoCard>
    </div>
  );
}
