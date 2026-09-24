"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";

const W = 560, H = 210;
const MATS = [
  { name: "金", rho: 19.3, c: "#f5b301" }, { name: "铁", rho: 7.9, c: "#8a94a6" },
  { name: "铝", rho: 2.7, c: "#c0c8d4" }, { name: "水", rho: 1.0, c: "#3b82f6" },
  { name: "木", rho: 0.6, c: "#b5843f" }, { name: "泡沫", rho: 0.05, c: "#d8d3c2" },
];

export function DensityCompareDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [vol, setVol] = useState(50); // cm³
  const [sel, setSel] = useState(1);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    const n = MATS.length, gap = W / n, cube = 40, baseY = 168, mMax = 19.3 * vol, barH = 78;

    ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui"; ctx.fillText(`相同体积 V = ${vol} cm³，不同物质，质量却不同`, 14, 22);

    MATS.forEach((m, i) => {
      const cx = gap * (i + 0.5), mass = m.rho * vol, on = i === sel;
      // 质量条
      const bh = Math.max(2, (mass / mMax) * barH);
      ctx.fillStyle = on ? m.c : m.c + "cc"; ctx.fillRect(cx - 16, baseY - bh, 32, bh);
      // 同体积方块
      ctx.fillStyle = m.c; ctx.strokeStyle = on ? C.ink : "#b7c2d6"; ctx.lineWidth = on ? 3 : 1.5;
      ctx.fillRect(cx - cube / 2, 40, cube, cube); ctx.strokeRect(cx - cube / 2, 40, cube, cube);
      ctx.fillStyle = m.name === "泡沫" || m.name === "铝" ? C.ink : "#fff"; ctx.font = "700 13px system-ui"; ctx.textAlign = "center"; ctx.fillText(m.name, cx, 65);
      // 质量数值
      ctx.fillStyle = C.ink; ctx.font = "600 11px system-ui"; ctx.fillText(`${mass >= 100 ? mass.toFixed(0) : mass.toFixed(1)}g`, cx, baseY + 16);
      ctx.fillStyle = C.muted; ctx.font = "10px system-ui"; ctx.fillText(`ρ=${m.rho}`, cx, baseY + 30); ctx.textAlign = "left";
    });
  }

  useEffect(() => { render(); }, [vol, sel]);

  const m = MATS[sel], mass = m.rho * vol;
  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-1.5">
        {MATS.map((mm, i) => (
          <button key={mm.name} onClick={() => setSel(i)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${i === sel ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>{mm.name}</button>
        ))}
      </div>
      <div className="flex items-center gap-3"><span className="w-16 text-sm text-muted-foreground">体积 V</span>
        <input type="range" min={10} max={100} step={1} value={vol} onChange={(e) => setVol(Number(e.target.value))} className="flex-1" />
        <span className="w-16 text-xs text-muted-foreground">{vol} cm³</span></div>
      <p className="text-xs text-muted-foreground"><b>{m.name}</b>：ρ = {m.rho} g/cm³，V = {vol} cm³ → m = ρV = <b>{mass >= 100 ? mass.toFixed(0) : mass.toFixed(1)} g</b>。密度是物质的一种<b>特性</b>：同种物质密度不变，不同物质密度一般不同（跟质量、体积无关）。</p>
    </div>
  );
}
