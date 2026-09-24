"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 220, MX = 130, MY = 110, MAXR = 250;

export function SoundVibrationDemo() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState(false);
  const onRef = useRef(false); onRef.current = on;
  const st = useRef({ rings: [] as number[], spawn: 0, t: 0 });

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const s = st.current;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    // 声波（同心圆向外扩散）
    for (const r of s.rings) {
      ctx.strokeStyle = C.blue; ctx.globalAlpha = Math.max(0, 1 - r / MAXR) * 0.8; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(MX, MY, r, -Math.PI / 2.1, Math.PI / 2.1); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 扬声器（发声体），振动时面板左右抖动
    const vib = onRef.current ? Math.sin(s.t * 42) * 4 : 0;
    ctx.fillStyle = "#2b3350"; ctx.fillRect(40, MY - 34, 46, 68);
    ctx.fillStyle = C.violet; ctx.beginPath();
    ctx.moveTo(86, MY - 30); ctx.lineTo(118 + vib, MY - 20); ctx.lineTo(118 + vib, MY + 20); ctx.lineTo(86, MY + 30); ctx.closePath(); ctx.fill();
    // 标签
    ctx.fillStyle = onRef.current ? C.emerald : C.rose; ctx.font = "700 16px system-ui";
    ctx.fillText(onRef.current ? "♪ 正在振动 → 发声" : "■ 停止振动 → 不发声", 200, 40);
  }

  useRafLoop((dt) => {
    const s = st.current, f = dt / 1000; s.t += f;
    for (let i = s.rings.length - 1; i >= 0; i--) { s.rings[i] += 150 * f; if (s.rings[i] > MAXR) s.rings.splice(i, 1); }
    if (onRef.current) { s.spawn += f; if (s.spawn > 0.5) { s.spawn = 0; s.rings.push(6); } }
    render();
  }, true, canvasRef); // 一直跑，让停止后的波纹也能扩散消失

  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setOn((v) => !v)}>{on ? "让它停下" : "让它振动"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">声音是由物体<b>振动</b>产生的：喇叭纸盆振动，就不断向外发出声波；一旦振动停止，就不再发声（波纹扩散完就消失了）。</p>
    </div>
  );
}
