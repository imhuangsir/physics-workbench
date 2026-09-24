"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { DemoCard } from "@/components/demos/DemoCard";
import { BalanceDemo } from "@/components/demos/BalanceDemo";
import { DensityCompareDemo } from "@/components/demos/DensityCompareDemo";
import { DisplacementDemo } from "@/components/demos/DisplacementDemo";

export default function Chapter6Demos() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/student/demos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 全部章节
        </Link>
        <SectionLabel className="mt-2">第 6 章 · 质量与密度</SectionLabel>
        <p className="text-sm text-muted-foreground">用天平测质量、密度是物质的特性 ρ=m/V、用量筒排水法测体积。</p>
      </div>

      <DemoCard title="用天平测质量" tag="砝码 + 游码" desc="加减砝码、移动游码，让横梁平衡，读出物体质量。">
        <BalanceDemo />
      </DemoCard>

      <DemoCard title="密度是物质的特性" tag="ρ = m / V" desc="相同体积、不同物质，质量差别很大——这就是密度不同。">
        <DensityCompareDemo />
      </DemoCard>

      <DemoCard title="量筒排水法测体积" tag="V = V₂ − V₁" desc="把不规则物体浸没到量筒里，看水面升高多少。">
        <DisplacementDemo />
      </DemoCard>
    </div>
  );
}
