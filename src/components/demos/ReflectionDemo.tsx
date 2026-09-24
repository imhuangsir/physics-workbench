"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";

const W = 560, H = 210, MY = 168, CX = 280, LEN = 132;

export function ReflectionDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [deg, setDeg] = useState(35); // 入射角

  function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 11 * Math.cos(ang - 0.4), y - 11 * Math.sin(ang - 0.4));
    ctx.lineTo(x - 11 * Math.cos(ang + 0.4), y - 11 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const r = deg * Math.PI / 180, s = Math.sin(r), c = Math.cos(r);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 镜面 + 斜线阴影
    ctx.strokeStyle = "#5b6480"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(48, MY); ctx.lineTo(512, MY); ctx.stroke();
    ctx.strokeStyle = "#9aa4bd"; ctx.lineWidth = 1.5;
    for (let x = 60; x <= 500; x += 20) { ctx.beginPath(); ctx.moveTo(x, MY); ctx.lineTo(x - 10, MY + 11); ctx.stroke(); }

    // 法线
    ctx.strokeStyle = "#9aa4bd"; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(CX, MY); ctx.lineTo(CX, 24); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("法线", CX + 6, 30);

    // 入射光线（从左上射向 O）
    const Ix = CX - LEN * s, Iy = MY - LEN * c;
    ctx.strokeStyle = C.amber; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(Ix, Iy); ctx.lineTo(CX, MY); ctx.stroke();
    ctx.fillStyle = C.amber; arrow(ctx, (Ix + CX) / 2, (Iy + MY) / 2, Math.atan2(c, s)); // 指向 O
    // 反射光线（从 O 射向右上）
    const Rx = CX + LEN * s, Ry = MY - LEN * c;
    ctx.strokeStyle = C.rose; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(CX, MY); ctx.lineTo(Rx, Ry); ctx.stroke();
    ctx.fillStyle = C.rose; arrow(ctx, (CX + Rx) / 2 + s * 8, (MY + Ry) / 2 - c * 8, Math.atan2(-c, s));

    // 角弧
    ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(CX, MY, 40, -Math.PI / 2 - r, -Math.PI / 2); ctx.stroke();
    ctx.strokeStyle = C.rose; ctx.beginPath(); ctx.arc(CX, MY, 40, -Math.PI / 2, -Math.PI / 2 + r, false); ctx.stroke();

    // 点 O 与角度
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(CX, MY, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.amber; ctx.font = "700 13px system-ui"; ctx.fillText(`入射角 ${deg}°`, 60, 44);
    ctx.fillStyle = C.rose; ctx.fillText(`反射角 ${deg}°`, W - 150, 44);
  }

  useEffect(() => { render(); }, [deg]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex items-center gap-3"><span className="w-24 text-sm text-muted-foreground">入射角</span>
        <input type="range" min={0} max={80} step={1} value={deg} onChange={(e) => setDeg(Number(e.target.value))} className="flex-1" />
        <span className="w-10 text-xs text-muted-foreground">{deg}°</span></div>
      <p className="text-xs text-muted-foreground">拖动改变入射角，<b>反射角始终等于入射角</b>。反射光线、入射光线分居法线两侧，三者在同一平面内。（角都是从<b>法线</b>量起，不是从镜面量）</p>
    </div>
  );
}
