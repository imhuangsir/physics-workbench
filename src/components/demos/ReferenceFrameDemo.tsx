"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 640, H = 320, SPEED = 95, yA = 140, yB = 300, CENTER = 300, CYC = W + 200;

function tree(ctx: CanvasRenderingContext2D, x: number, gy: number) {
  ctx.fillStyle = "#8a5a34"; ctx.fillRect(x - 3, gy - 22, 6, 22);
  ctx.fillStyle = "#3fae6a"; ctx.beginPath(); ctx.arc(x, gy - 28, 15, 0, Math.PI * 2); ctx.fill();
}
function person(ctx: CanvasRenderingContext2D, x: number, gy: number, color: string) {
  ctx.fillStyle = "#f3c19b"; ctx.beginPath(); ctx.arc(x, gy - 30, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x - 7, gy); ctx.lineTo(x + 7, gy); ctx.lineTo(x + 4, gy - 22); ctx.lineTo(x - 4, gy - 22); ctx.closePath(); ctx.fill();
}
function bus(ctx: CanvasRenderingContext2D, x: number, gy: number) {
  ctx.fillStyle = C.violet; ctx.fillRect(x, gy - 46, 116, 40);
  ctx.fillStyle = "#dbeafe"; for (let i = 0; i < 3; i++) ctx.fillRect(x + 10 + i * 30, gy - 40, 22, 16);
  ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(x + 21, gy - 32, 5, 0, Math.PI * 2); ctx.fill(); // 小明的头
  ctx.fillStyle = "#1f2740"; for (const c of [x + 26, x + 90]) { ctx.beginPath(); ctx.arc(c, gy - 4, 9, 0, Math.PI * 2); ctx.fill(); }
}
function tile(phase: number, period: number, count: number, fn: (x: number) => void) {
  const span = period * count;
  for (let i = 0; i <= count; i++) fn((((i * period + phase) % span) + span) % span);
}
function panel(ctx: CanvasRenderingContext2D, top: number, h: number, gy: number, title: string, note: string) {
  ctx.save(); ctx.beginPath(); ctx.rect(0, top, W, h); ctx.clip();
  ctx.fillStyle = C.sky; ctx.fillRect(0, top, W, h);
  ctx.fillStyle = C.ground; ctx.fillRect(0, gy, W, top + h - gy);
  ctx.fillStyle = "rgba(255,255,255,.82)"; ctx.fillRect(8, top + 8, 236, 26);
  ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui"; ctx.fillText(title, 16, top + 25);
  ctx.fillStyle = C.rose; ctx.font = "600 12px system-ui"; ctx.fillText(note, 16, top + 46);
  return () => ctx.restore();
}

export function ReferenceFrameDemo() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(!reduce);
  const d = useRef(0);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const dd = d.current;
    // 视角一：以地面为参照物——车在动，路边静止
    let end = panel(ctx, 0, 150, yA, "① 路边视角（参照物＝地面）", "车 → 运动，树/小红 静止");
    tree(ctx, 110, yA); person(ctx, 545, yA, C.emerald);
    bus(ctx, -116 + (dd % CYC), yA);
    end();
    // 视角二：以小车为参照物——车不动，窗外后退
    end = panel(ctx, 152, 168, yB, "② 车内视角（参照物＝小车）", "车 静止，树/小红 ← 向后退");
    tile(-dd, 190, 5, (x) => tree(ctx, x, yB));
    tile(-dd + 300, 380, 3, (x) => person(ctx, x, yB, C.emerald));
    bus(ctx, CENTER - 58, yB);
    end();
    ctx.strokeStyle = C.grid; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 151); ctx.lineTo(W, 151); ctx.stroke();
  }

  useRafLoop((dt) => { d.current += (SPEED * dt) / 1000; render(); }, playing);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setPlaying((p) => !p)}>{playing ? "暂停" : "播放"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">上下两个画面是<b>同一辆车、同一时刻</b>：站在路边看，车在动；坐在车里看，车没动、窗外的树和小红在向后退。所以"动还是不动"取决于你选谁做<b>参照物</b>——这就是运动的相对性（就像你坐车时觉得旁边的树往后跑）。</p>
    </div>
  );
}
