"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 640, H = 220, TX = 210, EX = 600, CARW = 52, VA = 90, VB0 = 20, ACC = 46, VBMAX = 210, MAXMS = 7;
const toMs = (px: number) => px / 30;

function car(ctx: CanvasRenderingContext2D, x: number, gy: number, color: string) {
  ctx.fillStyle = color; ctx.fillRect(x, gy - 22, CARW, 16);
  ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.fillRect(x + 10, gy - 32, 26, 12);
  ctx.fillStyle = "#1f2740";
  for (const c of [x + 13, x + CARW - 13]) { ctx.beginPath(); ctx.arc(c, gy - 4, 6, 0, Math.PI * 2); ctx.fill(); }
}
function lane(ctx: CanvasRenderingContext2D, top: number, title: string, sub: string, vMs: number, color: string) {
  ctx.fillStyle = C.ink; ctx.font = "700 14px system-ui"; ctx.fillText(title, 14, top + 18);
  ctx.fillStyle = C.muted; ctx.font = "600 13px system-ui"; ctx.fillText(sub, 14, top + 40);
  ctx.fillStyle = color; ctx.font = "800 20px system-ui"; ctx.fillText(`v = ${vMs.toFixed(1)} m/s`, 14, top + 66);
  // 速度条
  ctx.fillStyle = C.grid; ctx.fillRect(14, top + 76, 180, 10);
  ctx.fillStyle = color; ctx.fillRect(14, top + 76, Math.min(1, vMs / MAXMS) * 180, 10);
  // 轨道
  ctx.strokeStyle = C.grid; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(TX, top + 70); ctx.lineTo(EX, top + 70); ctx.stroke();
}

export function MotionTypesDemo() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const st = useRef({ xA: TX, xB: TX, tR: 0 });

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const s = st.current, vB = Math.min(VBMAX, VB0 + ACC * s.tR);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    lane(ctx, 12, "匀速直线运动", "快慢不变", toMs(VA), C.blue);
    car(ctx, s.xA, 82, C.blue);
    lane(ctx, 118, "变速直线运动（加速）", "越来越快 ↑", toMs(vB), C.amber);
    car(ctx, s.xB, 188, C.amber);
  }

  useRafLoop((dt) => {
    const f = dt / 1000, s = st.current;
    s.xA += VA * f; if (s.xA > EX) s.xA = TX - CARW;
    const vB = Math.min(VBMAX, VB0 + ACC * s.tR);
    s.xB += vB * f; s.tR += f; if (s.xB > EX) { s.xB = TX - CARW; s.tR = 0; }
    render();
  }, playing, canvasRef);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setPlaying((p) => !p)}>{playing ? "暂停" : "播放"}</Button>
        <Button size="sm" variant="outline" onClick={() => { st.current = { xA: TX, xB: TX, tR: 0 }; render(); }}>重置</Button>
      </div>
      <p className="text-xs text-muted-foreground">盯着两个<b>速度计</b>：上面匀速车的数字一直是 3.0 m/s 不变；下面变速车从慢开始、数字一路往上涨（越开越快）。速度<b>变不变</b>，就是匀速和变速的区别。</p>
    </div>
  );
}
