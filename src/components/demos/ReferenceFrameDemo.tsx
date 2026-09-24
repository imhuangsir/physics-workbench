"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 640, H = 300, GY = 224, CENTER = 300;
type RefObj = "ground" | "car" | "cloud";
const NAME: Record<RefObj, string> = { ground: "地面 / 树木", car: "小车", cloud: "云" };
const V = { ground: 0, car: 70, cloud: 22 };

function drawTiled(ctx: CanvasRenderingContext2D, phase: number, period: number, count: number, fn: (x: number) => void) {
  const span = period * count;
  for (let i = 0; i <= count; i++) fn((((i * period + phase) % span) + span) % span);
}
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#ffffff";
  for (const [dx, dy, r] of [[0, 6, 16], [16, 0, 20], [36, 6, 15], [18, 12, 18]] as const) {
    ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
  }
}
function drawTree(ctx: CanvasRenderingContext2D, x: number) {
  ctx.fillStyle = "#8a5a34"; ctx.fillRect(x - 4, GY - 26, 8, 26);
  ctx.fillStyle = "#3fae6a"; ctx.beginPath(); ctx.arc(x, GY - 34, 18, 0, Math.PI * 2); ctx.fill();
}
function drawCar(ctx: CanvasRenderingContext2D, x: number) {
  ctx.fillStyle = C.violet; ctx.fillRect(x, GY - 34, 92, 24);
  ctx.fillStyle = "#a78bfa"; ctx.fillRect(x + 22, GY - 50, 42, 18);
  ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.arc(x + 43, GY - 41, 5, 0, Math.PI * 2); ctx.fill(); // 乘客
  ctx.fillStyle = "#1f2740";
  for (const cx of [x + 22, x + 70]) { ctx.beginPath(); ctx.arc(cx, GY - 8, 10, 0, Math.PI * 2); ctx.fill(); }
}
function dir(v: number) { return v > 1 ? "向右 →" : v < -1 ? "← 向左" : "静止"; }

export function ReferenceFrameDemo() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ref, setRef] = useState<RefObj>("ground");
  const [playing, setPlaying] = useState(!reduce);
  const refCur = useRef<RefObj>("ground"); refCur.current = ref;
  const st = useRef({ car: 0, cloud: 80, road: 0, tree: 40 });

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const s = st.current;
    ctx.fillStyle = C.sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.ground; ctx.fillRect(0, GY, W, H - GY);
    drawTiled(ctx, s.cloud, 260, 3, (x) => drawCloud(ctx, x, 48));
    drawTiled(ctx, s.tree, 170, 5, (x) => drawTree(ctx, x));
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 5; ctx.setLineDash([26, 22]); ctx.lineDashOffset = -s.road;
    ctx.beginPath(); ctx.moveTo(0, GY + 26); ctx.lineTo(W, GY + 26); ctx.stroke(); ctx.setLineDash([]);
    let cx = CENTER + s.car; if (cx > W + 60) cx -= W + 120; if (cx < -60) cx += W + 120;
    drawCar(ctx, cx - 46);
    // 状态文字
    const vr = V[refCur.current];
    ctx.fillStyle = "rgba(255,255,255,.82)"; ctx.fillRect(10, 10, 250, 74);
    ctx.fillStyle = C.ink; ctx.font = "600 13px system-ui"; ctx.fillText(`参照物：${NAME[refCur.current]}（静止）`, 20, 30);
    ctx.font = "13px system-ui"; ctx.fillStyle = C.muted;
    ctx.fillText(`小车：${dir(V.car - vr)}`, 20, 50);
    ctx.fillText(`云：${dir(V.cloud - vr)}    树木/地面：${dir(0 - vr)}`, 20, 70);
  }

  useRafLoop((dt) => {
    const vr = V[refCur.current], f = dt / 1000, s = st.current;
    s.car += (V.car - vr) * f; s.cloud += (V.cloud - vr) * f; s.road += (0 - vr) * f; s.tree += (0 - vr) * f;
    render();
  }, playing);
  useEffect(() => { render(); }); // 暂停或切换参照物时也重绘

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">选参照物：</span>
        {(Object.keys(NAME) as RefObj[]).map((k) => (
          <Button key={k} size="sm" variant={ref === k ? "default" : "outline"} onClick={() => setRef(k)}>{NAME[k]}</Button>
        ))}
        <Button size="sm" variant="secondary" onClick={() => setPlaying((p) => !p)}>{playing ? "暂停" : "播放"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">同一辆小车，选不同参照物，"运动还是静止"的结论就不同——这说明运动和静止是<b>相对</b>的。</p>
    </div>
  );
}
