"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";

const W = 560, H = 222, MX = 300, OY = 128, FH = 46, EX = 138, EY = 46, BY = 196;

export function PlaneMirrorDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [d, setD] = useState(120); // 物到镜面距离

  function drawF(ctx: CanvasRenderingContext2D, cx: number, dir: number, dash: boolean) {
    ctx.setLineDash(dash ? [5, 4] : []); ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(cx, OY); ctx.lineTo(cx, OY + FH);
    ctx.moveTo(cx, OY); ctx.lineTo(cx + dir * 22, OY);
    ctx.moveTo(cx, OY + 20); ctx.lineTo(cx + dir * 16, OY + 20); ctx.stroke(); ctx.setLineDash([]);
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const xo = MX - d, xi = MX + d;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 镜面 + 背面阴影
    ctx.strokeStyle = "#5b6480"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(MX, 18); ctx.lineTo(MX, H - 12); ctx.stroke();
    ctx.strokeStyle = "#b7c2d6"; ctx.lineWidth = 1.5;
    for (let y = 24; y <= H - 16; y += 16) { ctx.beginPath(); ctx.moveTo(MX, y); ctx.lineTo(MX + 10, y - 9); ctx.stroke(); }
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("平面镜", MX - 20, 14);

    // 光线：从物尖出发 → 镜面反射 → 进入眼睛；反射线的反向延长线交于像
    const T = { x: xo, y: OY }, Tp = { x: xi, y: OY };
    [-6, 6].forEach((off) => {
      const ey = EY + off, t = (MX - Tp.x) / (EX - Tp.x), py = Tp.y + t * (ey - Tp.y);
      ctx.strokeStyle = C.amber; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(T.x, T.y); ctx.lineTo(MX, py); ctx.lineTo(EX, ey); ctx.stroke();
      ctx.strokeStyle = "#e3b778"; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(MX, py); ctx.lineTo(Tp.x, Tp.y); ctx.stroke(); ctx.setLineDash([]);
    });

    // 距离标注（沿底部）
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(xo, BY + 8); ctx.lineTo(MX, BY + 8); ctx.lineTo(xi, BY + 8); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText(`${d}`, (xo + MX) / 2 - 6, BY + 22); ctx.fillText(`${d}`, (MX + xi) / 2 - 6, BY + 22);

    // 眼睛
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(EX, EY, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(EX, EY, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText("眼睛", EX - 12, EY - 14);

    // 物（实）与像（虚）
    ctx.strokeStyle = C.blue; drawF(ctx, xo, 1, false);
    ctx.strokeStyle = "#9db4d8"; drawF(ctx, xi, -1, true);
    ctx.fillStyle = C.blue; ctx.font = "700 12px system-ui"; ctx.fillText("物", xo - 4, OY + FH + 16);
    ctx.fillStyle = "#7c93bd"; ctx.fillText("像（虚）", xi - 16, OY + FH + 16);
  }

  useEffect(() => { render(); }, [d]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex items-center gap-3"><span className="w-24 text-sm text-muted-foreground">物离镜面</span>
        <input type="range" min={60} max={175} step={1} value={d} onChange={(e) => setD(Number(e.target.value))} className="flex-1" /></div>
      <p className="text-xs text-muted-foreground">物体射向镜面的光被反射进入眼睛；把<b>反射光线反向延长</b>（虚线），就交于镜后的<b>虚像</b>。像与物<b>等大</b>、<b>到镜面距离相等</b>、<b>左右相反</b>（看字母 F 的朝向）。拖滑块，像会跟着一起远近。</p>
    </div>
  );
}
