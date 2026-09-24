"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";

const W = 560, H = 230, CX = 220, SURF = 182;
type P = { x: number; y: number; vx: number; vy: number };

export function EvaporationDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [temp, setTemp] = useState(0.5);
  const [area, setArea] = useState(0.6);
  const [wind, setWind] = useState(0.4);
  const r = useRef({ temp: 0.5, area: 0.6, wind: 0.4 });
  r.current = { temp, area, wind };
  const st = useRef({ spawn: 0, ps: [] as P[] });

  const rate = 0.4 * temp + 0.3 * area + 0.3 * wind; // 0..1

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const { temp: tp, area: ar, wind: wd } = r.current, rt = 0.4 * tp + 0.3 * ar + 0.3 * wd;
    const swid = 70 + ar * 150;
    ctx.fillStyle = "#f2f7ff"; ctx.fillRect(0, 0, W, H);

    // 太阳（温度越高越大越亮）
    const sr = 14 + tp * 16;
    ctx.fillStyle = tp > 0.6 ? "#ffb020" : "#ffd36b";
    ctx.beginPath(); ctx.arc(496, 46, sr, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ctx.fillStyle as string; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r0 = sr + 5, r1 = sr + 6 + tp * 12; ctx.beginPath(); ctx.moveTo(496 + Math.cos(a) * r0, 46 + Math.sin(a) * r0); ctx.lineTo(496 + Math.cos(a) * r1, 46 + Math.sin(a) * r1); ctx.stroke(); }

    // 风（越快箭头越多越长）
    const nw = Math.round(wd * 4);
    ctx.strokeStyle = "#9db4d8"; ctx.fillStyle = "#9db4d8"; ctx.lineWidth = 2;
    for (let i = 0; i < nw; i++) { const y = 66 + i * 22, len = 26 + wd * 44; ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(12 + len, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(12 + len, y); ctx.lineTo(12 + len - 7, y - 4); ctx.lineTo(12 + len - 7, y + 4); ctx.closePath(); ctx.fill(); }

    // 逃逸的水分子
    ctx.fillStyle = "#5aa0e6";
    for (const p of st.current.ps) { ctx.globalAlpha = Math.max(0, p.y / SURF); ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;

    // 盘子 + 水
    ctx.fillStyle = "#bfe0ff"; ctx.beginPath(); ctx.ellipse(CX, SURF, swid / 2, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#a9d2f7"; ctx.fillRect(CX - swid / 2, SURF, swid, 16);
    ctx.strokeStyle = "#8fa3c4"; ctx.lineWidth = 3; ctx.beginPath();
    ctx.moveTo(CX - swid / 2 - 8, SURF + 4); ctx.lineTo(CX - swid / 2, SURF + 22); ctx.lineTo(CX + swid / 2, SURF + 22); ctx.lineTo(CX + swid / 2 + 8, SURF + 4); ctx.stroke();

    // 蒸发速度计
    const mx = 528, mtop = 60, mbot = 196;
    ctx.fillStyle = C.ink; ctx.font = "700 12px system-ui"; ctx.fillText("蒸发", mx - 18, 48); ctx.fillText("速度", mx - 18, 62);
    ctx.strokeStyle = "#cfd8e6"; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(mx, mbot); ctx.lineTo(mx, mtop); ctx.stroke();
    ctx.strokeStyle = rt > 0.66 ? C.rose : rt > 0.4 ? C.amber : C.emerald; ctx.beginPath(); ctx.moveTo(mx, mbot); ctx.lineTo(mx, mbot - (mbot - mtop) * rt); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText(rt > 0.66 ? "快" : rt > 0.4 ? "中" : "慢", mx - 6, mbot + 18);
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("蒸发吸热 → 剩下的水会变凉（蒸发致冷）", 12, 218);
  }

  useRafLoop((dt) => {
    const f = dt / 1000, { temp: tp, area: ar, wind: wd } = r.current, rt = 0.4 * tp + 0.3 * ar + 0.3 * wd, swid = 70 + ar * 150, s = st.current;
    s.spawn += f; const iv = 0.5 - 0.42 * rt;
    if (s.spawn > iv) { s.spawn = 0; s.ps.push({ x: CX - swid / 2 + Math.random() * swid, y: SURF - 2, vx: wd * 46 + Math.random() * 10, vy: -(24 + rt * 70 + Math.random() * 20) }); }
    for (let i = s.ps.length - 1; i >= 0; i--) { const p = s.ps[i]; p.x += p.vx * f; p.y += p.vy * f; if (p.y < 30 || p.x > W) s.ps.splice(i, 1); }
    render();
  }, true, canvasRef);
  useEffect(() => { render(); });

  const Row = ({ label, v, set, lo, hi }: { label: string; v: number; set: (n: number) => void; lo: string; hi: string }) => (
    <div className="flex items-center gap-3"><span className="w-16 text-sm text-muted-foreground">{label}</span>
      <span className="w-8 text-right text-xs text-muted-foreground">{lo}</span>
      <input type="range" min={0} max={1} step={0.01} value={v} onChange={(e) => set(Number(e.target.value))} className="flex-1" />
      <span className="w-8 text-xs text-muted-foreground">{hi}</span></div>
  );

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="space-y-2">
        <Row label="温度" v={temp} set={setTemp} lo="低" hi="高" />
        <Row label="表面积" v={area} set={setArea} lo="小" hi="大" />
        <Row label="空气流速" v={wind} set={setWind} lo="无风" hi="大风" />
      </div>
      <p className="text-xs text-muted-foreground">影响蒸发快慢的三个因素：<b>液体温度越高、表面积越大、表面空气流动越快</b>，蒸发就越快（速度计越高、逃逸的分子越多）。蒸发要吸热，所以能使周围降温。</p>
    </div>
  );
}
