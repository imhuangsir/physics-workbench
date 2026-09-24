"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 240, XL = 150, XR = 258, YB = 202, YT = 40, V1 = 40;

export function DisplacementDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inside, setInside] = useState(false);
  const [vobj, setVobj] = useState(30);
  const r = useRef({ inside: false, vobj: 30 }); r.current = { inside, vobj };
  const anim = useRef({ level: V1, sy: 16 });

  const y = (v: number) => YB - (v / 100) * (YB - YT);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const { inside: ins, vobj: vo } = r.current, V2 = V1 + vo;
    const a = anim.current;
    a.level += ((ins ? V2 : V1) - a.level) * 0.14;
    a.sy += ((ins ? y(V1) + 30 : 16) - a.sy) * 0.14;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 石块（先画，后被水覆盖显出"浸没"）；大小随物体体积变化
    const scx = (XL + XR) / 2, k = 0.6 + (vo - 10) / 40 * 0.9;
    ctx.fillStyle = "#8a94a6"; ctx.beginPath();
    ([[-22, 0], [6, -12], [24, 6], [12, 24], [-16, 20]] as const).forEach(([dx, dy], i) => { const x = scx + dx * k, yy = a.sy + dy * k; i === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); });
    ctx.closePath(); ctx.fill();

    // 水
    ctx.fillStyle = "rgba(90,160,230,0.72)"; ctx.fillRect(XL + 2, y(a.level), XR - XL - 4, YB - y(a.level));
    // 量筒玻璃
    ctx.strokeStyle = "#8fa3c4"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(XL, YT - 12); ctx.lineTo(XL, YB); ctx.lineTo(XR, YB); ctx.lineTo(XR, YT - 12); ctx.stroke();
    // 刻度
    ctx.strokeStyle = "#b7c2d6"; ctx.fillStyle = C.muted; ctx.font = "10px system-ui"; ctx.lineWidth = 1;
    for (let v = 0; v <= 100; v += 10) { const yy = y(v); ctx.beginPath(); ctx.moveTo(XR - (v % 20 === 0 ? 16 : 9), yy); ctx.lineTo(XR, yy); ctx.stroke(); if (v % 20 === 0) ctx.fillText(`${v}`, XR + 4, yy + 3); }
    ctx.fillStyle = C.muted; ctx.fillText("mL", XR + 4, YT - 2);

    // 水位标注
    ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui";
    ctx.fillText(`V₁ = ${V1} mL`, 300, 60);
    ctx.fillStyle = ins ? C.ink : "#b7c2d6"; ctx.fillText(`V₂ = ${(ins ? V2 : V1)} mL`, 300, 88);
    ctx.fillStyle = ins ? C.emerald : "#b7c2d6"; ctx.font = "700 15px system-ui";
    ctx.fillText(`V物 = V₂ − V₁ = ${ins ? vo : "?"} mL`, 300, 124);
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("（1 mL = 1 cm³）", 300, 148);
  }

  useRafLoop(() => render(), true);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => setInside((v) => !v)}>{inside ? "↑ 取出物体" : "↓ 放入物体"}</Button>
        <span className="text-sm text-muted-foreground">物体大小</span>
        <input type="range" min={10} max={50} step={1} value={vobj} onChange={(e) => setVobj(Number(e.target.value))} className="flex-1 min-w-[120px]" />
      </div>
      <p className="text-xs text-muted-foreground"><b>排水法</b>测不规则物体的体积：先读出水面刻度 V₁，把物体<b>完全浸没</b>后再读 V₂，则<b>物体体积 = V₂ − V₁</b>。配合天平测出质量，就能算出密度 ρ = m / V。</p>
    </div>
  );
}
