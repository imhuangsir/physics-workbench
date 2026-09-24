"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";

const W = 560, H = 210, MX = 290, TOPY = 96, FH = 54, EX = 92, EY = 84;

export function PlaneMirrorDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [d, setD] = useState(120); // 物到镜面距离

  function drawF(ctx: CanvasRenderingContext2D, cx: number, dir: number, dash: boolean) {
    ctx.setLineDash(dash ? [5, 4] : []); ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(cx, TOPY); ctx.lineTo(cx, TOPY + FH);
    ctx.moveTo(cx, TOPY); ctx.lineTo(cx + dir * 22, TOPY);
    ctx.moveTo(cx, TOPY + 22); ctx.lineTo(cx + dir * 16, TOPY + 22); ctx.stroke(); ctx.setLineDash([]);
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const xo = MX - d, xi = MX + d;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 镜面 + 背面阴影
    ctx.strokeStyle = "#5b6480"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(MX, 20); ctx.lineTo(MX, H - 14); ctx.stroke();
    ctx.strokeStyle = "#b7c2d6"; ctx.lineWidth = 1.5;
    for (let y = 28; y <= H - 20; y += 18) { ctx.beginPath(); ctx.moveTo(MX, y); ctx.lineTo(MX + 11, y - 10); ctx.stroke(); }
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("平面镜", MX - 20, 16);

    // 距离标注
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(xo, TOPY + FH + 12); ctx.lineTo(MX, TOPY + FH + 12); ctx.moveTo(MX, TOPY + FH + 12); ctx.lineTo(xi, TOPY + FH + 12); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText(`${d}`, (xo + MX) / 2 - 6, TOPY + FH + 26); ctx.fillText(`${d}`, (MX + xi) / 2 - 6, TOPY + FH + 26);

    // 光线：像尖 → 眼；实线在镜前，虚线在镜后
    const T = { x: xo, y: TOPY }, Tp = { x: xi, y: TOPY };
    [-7, 7].forEach((off) => {
      const ey = EY + off, t = (MX - Tp.x) / (EX - Tp.x), py = Tp.y + t * (ey - Tp.y);
      ctx.strokeStyle = C.amber; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(MX, py); ctx.lineTo(EX, ey); ctx.stroke(); // 入射 + 反射
      ctx.strokeStyle = "#e3b778"; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(MX, py); ctx.lineTo(Tp.x, Tp.y); ctx.stroke(); ctx.setLineDash([]); // 镜后延长线
    });

    // 眼睛
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(EX, EY, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(EX, EY, 3.5, 0, Math.PI * 2); ctx.fill();

    // 物（实）与像（虚）
    ctx.strokeStyle = C.blue; drawF(ctx, xo, 1, false);
    ctx.strokeStyle = "#9db4d8"; drawF(ctx, xi, -1, true);
    ctx.fillStyle = C.blue; ctx.font = "700 12px system-ui"; ctx.fillText("物", xo - 4, TOPY - 8);
    ctx.fillStyle = "#7c93bd"; ctx.fillText("虚像（左右相反）", xi - 20, TOPY - 8);
  }

  useEffect(() => { render(); }, [d]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex items-center gap-3"><span className="w-24 text-sm text-muted-foreground">物离镜面</span>
        <input type="range" min={60} max={180} step={1} value={d} onChange={(e) => setD(Number(e.target.value))} className="flex-1" /></div>
      <p className="text-xs text-muted-foreground">平面镜成的像：<b>与物等大</b>、<b>到镜面距离相等</b>、<b>左右相反</b>，是<b>虚像</b>（反射光线的反向延长线相交而成，光屏接收不到）。拖滑块，像会跟着一起远近。</p>
    </div>
  );
}
