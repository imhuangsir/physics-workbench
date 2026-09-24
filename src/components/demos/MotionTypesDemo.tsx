"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 640, H = 340, SX = 70, EX = 600, TEND = 5;
const distA = (t: number) => 106 * t;          // 匀速：距离∝时间
const distB = (t: number) => 21.2 * t * t;      // 变速(加速)：距离∝时间²
const gx = (t: number) => SX + (t / TEND) * (EX - SX);
const gy = (d: number) => 315 - (d / 530) * 130;

export function MotionTypesDemo() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(!reduce);
  const t = useRef(0);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const cur = t.current;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    // 两条轨道
    for (const [y, label] of [[44, "匀速"], [104, "变速(加速)"]] as const) {
      ctx.strokeStyle = C.grid; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(SX, y + 16); ctx.lineTo(EX, y + 16); ctx.stroke();
      ctx.fillStyle = C.muted; ctx.font = "600 12px system-ui"; ctx.fillText(label, 8, y + 4);
    }
    // 每秒落点标记（匀速等间距、变速越来越疏）
    for (let k = 1; k <= Math.floor(cur + 1e-6); k++) {
      for (const [y, dfn, color] of [[60, distA, C.blue], [120, distB, C.amber]] as const) {
        const x = SX + dfn(k);
        ctx.strokeStyle = color; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 2); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    // 两个小球
    const drawBall = (x: number, y: number, color: string, tag: string) => {
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "700 12px system-ui"; ctx.textAlign = "center"; ctx.fillText(tag, x, y + 4); ctx.textAlign = "left";
    };
    drawBall(SX + distA(cur), 60, C.blue, "A");
    drawBall(SX + distB(cur), 120, C.amber, "B");
    // s-t 图
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(SX, 175); ctx.lineTo(SX, 315); ctx.lineTo(EX, 315); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui";
    ctx.fillText("路程 s", SX - 4, 168); ctx.fillText("时间 t", EX - 40, 332);
    const curve = (dfn: (t: number) => number, color: string) => {
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath();
      for (let tt = 0; tt <= cur + 1e-6; tt += 0.05) { const px = gx(tt), py = gy(dfn(tt)); tt === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke();
    };
    curve(distA, C.blue);   // 直线
    curve(distB, C.amber);  // 上弯曲线
    ctx.fillStyle = C.blue; ctx.font = "600 12px system-ui"; ctx.fillText("A 匀速：直线", 380, 200);
    ctx.fillStyle = C.amber; ctx.fillText("B 变速：曲线", 380, 220);
  }

  useRafLoop((dt) => {
    t.current = Math.min(TEND, t.current + dt / 1000);
    render();
    if (t.current >= TEND) setPlaying(false);
  }, playing);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => { if (t.current >= TEND) t.current = 0; setPlaying((p) => !p); }}>{playing ? "暂停" : "播放"}</Button>
        <Button size="sm" variant="outline" onClick={() => { t.current = 0; setPlaying(false); render(); }}>重置</Button>
      </div>
      <p className="text-xs text-muted-foreground">A、B 用时相同、总路程相同（平均速度相同），但 A 每秒走得一样多（匀速，落点等距、s-t 是直线）；B 越走越快（变速，落点越来越疏、s-t 是上弯曲线）。</p>
    </div>
  );
}
