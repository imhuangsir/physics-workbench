"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";

const W = 560, H = 210, IY = 104, CX = 280, LEN = 122;

export function RefractionDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [deg, setDeg] = useState(50); // 入射角（空气侧）

  function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10 * Math.cos(ang - 0.4), y - 10 * Math.sin(ang - 0.4));
    ctx.lineTo(x - 10 * Math.cos(ang + 0.4), y - 10 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const r1 = deg * Math.PI / 180, s2 = Math.min(1, Math.sin(r1) / 1.33), r2 = Math.asin(s2);
    // 介质
    ctx.fillStyle = "#f2f7ff"; ctx.fillRect(0, 0, W, IY);
    ctx.fillStyle = "#cfe6ff"; ctx.fillRect(0, IY, W, H - IY);
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("空气", 14, 22); ctx.fillText("水", 14, IY + 22);
    ctx.strokeStyle = "#8fa3c4"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, IY); ctx.lineTo(W, IY); ctx.stroke();

    // 法线
    ctx.strokeStyle = "#9aa4bd"; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(CX, 16); ctx.lineTo(CX, H - 12); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.fillText("法线", CX + 6, 22);

    // 入射光线（空气，射向 O）
    const Ix = CX - LEN * Math.sin(r1), Iy = IY - LEN * Math.cos(r1);
    ctx.strokeStyle = C.amber; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(Ix, Iy); ctx.lineTo(CX, IY); ctx.stroke();
    ctx.fillStyle = C.amber; arrow(ctx, (Ix + CX) / 2, (Iy + IY) / 2, Math.atan2(Math.cos(r1), Math.sin(r1)));
    // 折射光线（水中，偏向法线）
    const Rx = CX + LEN * Math.sin(r2), Ry = IY + LEN * Math.cos(r2);
    ctx.strokeStyle = C.blue; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(CX, IY); ctx.lineTo(Rx, Ry); ctx.stroke();
    ctx.fillStyle = C.blue; arrow(ctx, (CX + Rx) / 2 + Math.sin(r2) * 6, (IY + Ry) / 2 + Math.cos(r2) * 6, Math.atan2(Math.cos(r2), Math.sin(r2)));
    // 反射光线（弱）
    ctx.strokeStyle = "#c3cede"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(CX, IY); ctx.lineTo(CX + LEN * 0.7 * Math.sin(r1), IY - LEN * 0.7 * Math.cos(r1)); ctx.stroke();

    // 角弧 + 标注
    ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(CX, IY, 34, -Math.PI / 2 - r1, -Math.PI / 2); ctx.stroke();
    ctx.strokeStyle = C.blue; ctx.beginPath(); ctx.arc(CX, IY, 34, Math.PI / 2 - r2, Math.PI / 2); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(CX, IY, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.amber; ctx.font = "700 13px system-ui"; ctx.fillText(`入射角 ${deg}°`, 60, 44);
    ctx.fillStyle = C.blue; ctx.fillText(`折射角 ${Math.round(r2 * 180 / Math.PI)}°`, W - 130, H - 16);
  }

  useEffect(() => { render(); }, [deg]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex items-center gap-3"><span className="w-24 text-sm text-muted-foreground">入射角</span>
        <input type="range" min={0} max={80} step={1} value={deg} onChange={(e) => setDeg(Number(e.target.value))} className="flex-1" />
        <span className="w-10 text-xs text-muted-foreground">{deg}°</span></div>
      <p className="text-xs text-muted-foreground">光从空气<b>斜射入水</b>时会发生折射，<b>折射角小于入射角</b>（光线向法线偏折）。垂直入射时不偏折。光路是<b>可逆</b>的：从水射入空气时折射角反而更大。（同时还有部分光被反射，图中浅色线）</p>
    </div>
  );
}
