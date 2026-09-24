"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";

const W = 560, H = 214;
const MATS = [
  { name: "金", rho: 19.3, c: "#f5b301" }, { name: "铜", rho: 8.9, c: "#d08b5b" },
  { name: "铁", rho: 7.9, c: "#8a94a6" }, { name: "铝", rho: 2.7, c: "#c0c8d4" },
  { name: "水", rho: 1.0, c: "#3b82f6" }, { name: "冰", rho: 0.9, c: "#9fd0ff" },
];

export function DensityIdDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [m, setM] = useState(79);   // g
  const [v, setV] = useState(10);   // cm³

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const rho = m / v;
    let best = 0; for (let i = 1; i < MATS.length; i++) if (Math.abs(MATS[i].rho - rho) < Math.abs(MATS[best].rho - rho)) best = i;
    const matched = Math.abs(MATS[best].rho - rho) / MATS[best].rho < 0.06;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 待测物块（大小随体积）
    const side = 34 + Math.cbrt(v) * 9, bx = 106, by = 118;
    ctx.fillStyle = matched ? MATS[best].c : "#9db4d8";
    ctx.fillRect(bx - side / 2, by - side / 2, side, side);
    ctx.fillStyle = C.ink; ctx.font = "700 12px system-ui"; ctx.textAlign = "center";
    ctx.fillText("待测物块", bx, 30); ctx.fillText(`m = ${m} g`, bx, by + side / 2 + 20); ctx.fillText(`V = ${v} cm³`, bx, by + side / 2 + 38);
    ctx.textAlign = "left";

    // ρ 与结论
    ctx.fillStyle = C.ink; ctx.font = "700 20px system-ui"; ctx.fillText(`ρ = m/V = ${rho.toFixed(2)} g/cm³`, 220, 40);
    ctx.fillStyle = matched ? C.emerald : C.amber; ctx.font = "700 14px system-ui";
    ctx.fillText(matched ? `✓ 最可能是「${MATS[best].name}」` : `与「${MATS[best].name}」最接近（差得较多，可能是其他物质）`, 220, 62);

    // 密度表
    const x0 = 220, w = 300, top = 84, rowH = 20;
    MATS.forEach((mt, i) => {
      const y = top + i * rowH, on = i === best;
      ctx.fillStyle = on ? C.ink : C.muted; ctx.font = on ? "700 12px system-ui" : "12px system-ui";
      ctx.fillText(mt.name, x0, y); ctx.fillText(`${mt.rho}`, x0 + 30, y);
      const barW = (mt.rho / 19.3) * (w - 80);
      ctx.fillStyle = on ? mt.c : mt.c + "99"; ctx.fillRect(x0 + 60, y - 9, barW, 11);
    });
  }

  useEffect(() => { render(); }, [m, v]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="space-y-2">
        <div className="flex items-center gap-3"><span className="w-20 text-sm text-muted-foreground">质量 m</span>
          <input type="range" min={5} max={400} step={1} value={m} onChange={(e) => setM(Number(e.target.value))} className="flex-1" />
          <span className="w-16 text-xs text-muted-foreground">{m} g</span></div>
        <div className="flex items-center gap-3"><span className="w-20 text-sm text-muted-foreground">体积 V</span>
          <input type="range" min={2} max={120} step={1} value={v} onChange={(e) => setV(Number(e.target.value))} className="flex-1" />
          <span className="w-16 text-xs text-muted-foreground">{v} cm³</span></div>
      </div>
      <p className="text-xs text-muted-foreground">测出物块的质量和体积，算出密度 <b>ρ = m/V</b>，再和密度表对照，就能<b>鉴别它是什么材料</b>——这是密度在生活中的重要应用（还可用于配制溶液、判断空心实心等）。试试把 m、V 调成 79 g / 10 cm³。</p>
    </div>
  );
}
