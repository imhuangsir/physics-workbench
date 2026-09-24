"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionLabel } from "@/components/ui/bento";
import { DemoCard } from "@/components/demos/DemoCard";
import { SoundVibrationDemo } from "@/components/demos/SoundVibrationDemo";
import { SoundMediumDemo } from "@/components/demos/SoundMediumDemo";
import { SoundSpeedDemo } from "@/components/demos/SoundSpeedDemo";
import { PitchLoudnessDemo } from "@/components/demos/PitchLoudnessDemo";
import { TimbreDemo } from "@/components/demos/TimbreDemo";
import { SoundUsesDemo } from "@/components/demos/SoundUsesDemo";
import { NoiseDemo } from "@/components/demos/NoiseDemo";
import { SecLabel as Sec } from "@/components/demos/SecLabel";

export default function Chapter2Demos() {
  return (
    <div className="space-y-5">
      <div>
        <Link href="/student/demos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> 全部章节
        </Link>
        <SectionLabel className="mt-2">第 2 章 · 声现象</SectionLabel>
        <p className="text-sm text-muted-foreground">声音的产生与传播、声音的特性、声的利用、噪声的危害和控制。</p>
      </div>

      <Sec>第 1 节 · 声音的产生与传播</Sec>
      <DemoCard title="声音的产生" tag="振动" desc="让喇叭振动/停下，看声音是怎么来的。">
        <SoundVibrationDemo />
      </DemoCard>
      <DemoCard title="声的传播需要介质" tag="真空不能传声" desc="拖动改变罩内空气，抽成真空就听不到了。">
        <SoundMediumDemo />
      </DemoCard>
      <DemoCard title="声速与介质" tag="固体 > 液体 > 气体" desc="同样距离，声音在钢铁/水/空气里谁先到。">
        <SoundSpeedDemo />
      </DemoCard>

      <Sec>第 2 节 · 声音的特性</Sec>
      <DemoCard title="音调与响度" tag="频率 · 振幅（可发声）" desc="拖滑块看波形、点播放亲耳听：越密越高，越高越响。">
        <PitchLoudnessDemo />
      </DemoCard>
      <DemoCard title="音色" tag="波形（可发声）" desc="相同音调响度，不同乐器波形不同——这就是音色。">
        <TimbreDemo />
      </DemoCard>

      <Sec>第 3 节 · 声的利用</Sec>
      <DemoCard title="回声定位与声呐" tag="s = ½ v t" desc="声波往返一次，用时间算出目标距离。">
        <SoundUsesDemo />
      </DemoCard>

      <Sec>第 4 节 · 噪声的危害和控制</Sec>
      <DemoCard title="控制噪声的三条途径" tag="声源 / 传播 / 人耳" desc="从三处减弱噪声，看分贝怎么降下来。">
        <NoiseDemo />
      </DemoCard>
    </div>
  );
}
