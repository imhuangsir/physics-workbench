"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { DemoCard } from "@/components/demos/DemoCard";
import { PinholeDemo } from "@/components/demos/PinholeDemo";
import { ReflectionDemo } from "@/components/demos/ReflectionDemo";
import { PlaneMirrorDemo } from "@/components/demos/PlaneMirrorDemo";
import { RefractionDemo } from "@/components/demos/RefractionDemo";
import { DispersionDemo } from "@/components/demos/DispersionDemo";

export default function Chapter4Demos() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/student/demos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 全部章节
        </Link>
        <SectionLabel className="mt-2">第 4 章 · 光现象</SectionLabel>
        <p className="text-sm text-muted-foreground">光的直线传播、光的反射与平面镜成像、光的折射、光的色散。</p>
      </div>

      <DemoCard title="小孔成像" tag="光沿直线传播" desc="拖动光屏，看小孔后面成的是什么样的像。">
        <PinholeDemo />
      </DemoCard>

      <DemoCard title="光的反射" tag="反射角 = 入射角" desc="拖动入射角，看反射光线怎么变、两个角是否相等。">
        <ReflectionDemo />
      </DemoCard>

      <DemoCard title="平面镜成像" tag="等大 · 等距 · 虚像" desc="拖滑块改变物到镜面的距离，看像的位置和大小。">
        <PlaneMirrorDemo />
      </DemoCard>

      <DemoCard title="光的折射" tag="空气 ↔ 水" desc="拖动入射角，比较入射角和折射角的大小。">
        <RefractionDemo />
      </DemoCard>

      <DemoCard title="光的色散" tag="白光的组成" desc="白光通过三棱镜分解成七种色光。">
        <DispersionDemo />
      </DemoCard>
    </div>
  );
}
