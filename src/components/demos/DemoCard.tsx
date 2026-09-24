import * as React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/motion/fade-in";

/** 单个演示的外壳卡片：标题 + 概念标签 + 说明 + 交互区(children)。 */
export function DemoCard({ title, tag, desc, children, delay = 0 }: {
  title: string; tag?: string; desc?: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <FadeIn delay={delay}>
      <Card className="space-y-3 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold tracking-tight">{title}</h3>
            {tag && <Badge variant="info">{tag}</Badge>}
          </div>
          {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
        </div>
        {children}
      </Card>
    </FadeIn>
  );
}
