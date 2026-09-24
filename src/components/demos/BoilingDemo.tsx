"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 240;
const BX0 = 92, BX1 = 232, BTOP = 78, BBOT = 204, WSURF = 100;
const GX0 = 330, GX1 = 544, GY0 = 200, GYT = 40, TSTOP = 11, T100 = 6;

type B = { x: number; y: number; r: number };

export function BoilingDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const st = useRef({ t: 0, spawn: 0, bubbles: [] as B[] });

  const tempAt = (t: number) => Math.min(100, 20 + (80 / T100) * t);
  const gx = (t: number) => GX0 + (Math.min(t, TSTOP) / TSTOP) * (GX1 - GX0);
  const gy = (T: number) => GY0 - ((T - 20) / 85) * (GY0 - GYT);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const s = st.current, T = tempAt(s.t), boil = T >= 100;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 火焰
    const fl = 1 + Math.sin(s.t * 20) * 0.15;
    ctx.fillStyle = C.amber; ctx.beginPath();
    ctx.moveTo(BX0 + 20, BBOT + 30); ctx.quadraticCurveTo((BX0 + BX1) / 2 - 24, BBOT + 8, (BX0 + BX1) / 2, BBOT - 12 * fl);
    ctx.quadraticCurveTo((BX0 + BX1) / 2 + 24, BBOT + 8, BX1 - 20, BBOT + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.rose; ctx.beginPath();
    ctx.moveTo(BX0 + 40, BBOT + 30); ctx.quadraticCurveTo((BX0 + BX1) / 2, BBOT + 14, (BX0 + BX1) / 2, BBOT + 4 * fl);
    ctx.quadraticCurveTo((BX0 + BX1) / 2, BBOT + 14, BX1 - 40, BBOT + 30); ctx.closePath(); ctx.fill();

    // 水
    ctx.fillStyle = "#bfe0ff"; ctx.fillRect(BX0, WSURF, BX1 - BX0, BBOT - WSURF);
    // 气泡
    for (const b of s.bubbles) { ctx.strokeStyle = "#5aa0e6"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke(); }
    // 烧杯玻璃壁
    ctx.strokeStyle = "#8fa3c4"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(BX0, BTOP); ctx.lineTo(BX0, BBOT); ctx.lineTo(BX1, BBOT); ctx.lineTo(BX1, BTOP); ctx.stroke();

    // 温度计
    const tx = 262;
    ctx.strokeStyle = "#c3cede"; ctx.lineWidth = 10; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(tx, GY0); ctx.lineTo(tx, GYT); ctx.stroke();
    ctx.strokeStyle = boil ? C.rose : C.amber; ctx.beginPath(); ctx.moveTo(tx, GY0); ctx.lineTo(tx, gy(T)); ctx.stroke();
    ctx.fillStyle = boil ? C.rose : C.amber; ctx.beginPath(); ctx.arc(tx, GY0 + 6, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = "700 15px system-ui"; ctx.fillText(`${T.toFixed(0)}℃`, tx - 44, gy(T) + 5);

    // 坐标系
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(GX0, GYT); ctx.lineTo(GX0, GY0); ctx.lineTo(GX1, GY0); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("温度/℃", GX0 - 4, GYT - 12); ctx.fillText("时间", GX1 - 8, GY0 + 16);
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(GX0, gy(100)); ctx.lineTo(GX1, gy(100)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.rose; ctx.font = "600 11px system-ui"; ctx.fillText("沸点 100℃", GX1 - 66, gy(100) - 6);
    ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.beginPath();
    for (let tt = 0; tt <= Math.min(s.t, TSTOP) + 0.001; tt += 0.05) { const x = gx(tt), y = gy(tempAt(tt)); tt === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();

    // 说明
    ctx.fillStyle = boil ? C.rose : C.ink; ctx.font = "700 14px system-ui";
    ctx.fillText(boil ? "沸腾中！温度保持 100℃ 不变" : "加热升温中…", 8, 26);
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui";
    ctx.fillText(boil ? "气泡上升变大、到水面破裂" : "气泡上升途中变小、消失", 8, 224);
  }

  useRafLoop((dt) => {
    const s = st.current, f = dt / 1000; s.t += f; const boil = tempAt(s.t) >= 100;
    s.spawn += f; const iv = boil ? 0.12 : 0.5;
    if (s.spawn > iv) { s.spawn = 0; s.bubbles.push({ x: BX0 + 8 + Math.random() * (BX1 - BX0 - 16), y: BBOT - 4, r: boil ? 3 : 2.5 }); }
    for (let i = s.bubbles.length - 1; i >= 0; i--) {
      const b = s.bubbles[i]; b.y -= (boil ? 70 : 42) * f; b.r += (boil ? 5 : -3) * f;
      if (b.y <= WSURF + 2 || b.r <= 0.5) s.bubbles.splice(i, 1);
    }
    render();
  }, playing, canvasRef);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => { st.current.t = 0; st.current.bubbles = []; setPlaying(true); }}>▶ 开始加热</Button>
        {playing && <Button size="sm" variant="outline" onClick={() => setPlaying(false)}>暂停</Button>}
      </div>
      <p className="text-xs text-muted-foreground">给水持续加热，温度升到 <b>100℃</b> 开始沸腾；<b>沸腾时继续吸热，但温度保持不变</b>（曲线变平）。沸腾前气泡上升途中变小，沸腾时气泡上升途中变大。（标准大气压下水的沸点是 100℃）</p>
    </div>
  );
}
