"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const NODE = {
  solid: { x: 92, y: 150, label: "固体" },
  liquid: { x: 280, y: 56, label: "液体" },
  gas: { x: 468, y: 150, label: "气体" },
} as const;
type S = keyof typeof NODE;
const PROC: { k: string; from: S; to: S; heat: "吸热" | "放热"; ex: string }[] = [
  { k: "熔化", from: "solid", to: "liquid", heat: "吸热", ex: "冰化成水" },
  { k: "凝固", from: "liquid", to: "solid", heat: "放热", ex: "水结成冰" },
  { k: "汽化", from: "liquid", to: "gas", heat: "吸热", ex: "水烧干、湿衣服晾干" },
  { k: "液化", from: "gas", to: "liquid", heat: "放热", ex: "雾、露、“白气”" },
  { k: "升华", from: "solid", to: "gas", heat: "吸热", ex: "樟脑丸变小、干冰冒烟" },
  { k: "凝华", from: "gas", to: "solid", heat: "放热", ex: "霜、雾凇、窗上冰花" },
];
const R = 38;

export function PhaseChangesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState(0);
  const sr = useRef(0); sr.current = sel;
  const anim = useRef({ t: 0, p: 0 });

  function molecules(ctx: CanvasRenderingContext2D, n: S, t: number, on: boolean) {
    const { x, y } = NODE[n]; ctx.fillStyle = on ? C.violet : "#9db4d8";
    if (n === "solid") { for (let i = 0; i < 9; i++) { const gx = x - 16 + (i % 3) * 16, gy = y - 14 + Math.floor(i / 3) * 14; ctx.beginPath(); ctx.arc(gx + Math.sin(t * 6 + i) * 1.2, gy + Math.cos(t * 5 + i) * 1.2, 3, 0, Math.PI * 2); ctx.fill(); } }
    else if (n === "liquid") { for (let i = 0; i < 7; i++) { const a = i * 1.7; ctx.beginPath(); ctx.arc(x + Math.cos(a + t) * (10 + (i % 3) * 4), y + Math.sin(a + t * 1.3) * (8 + (i % 2) * 5), 3, 0, Math.PI * 2); ctx.fill(); } }
    else { for (let i = 0; i < 5; i++) { const a = i * 2.2; ctx.beginPath(); ctx.arc(x + Math.cos(a + t * 2.2) * (18 + (i % 2) * 6), y + Math.sin(a * 1.4 + t * 2) * (16 + (i % 2) * 4), 3, 0, Math.PI * 2); ctx.fill(); } }
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, 560, 214);
    const a = anim.current, pr = PROC[sr.current], hc = pr.heat === "吸热" ? C.rose : C.blue;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, 560, 214);

    // 三条底线（固-液-气三态之间）
    const pairs: [S, S][] = [["solid", "liquid"], ["liquid", "gas"], ["solid", "gas"]];
    ctx.strokeStyle = "#dbe3ef"; ctx.lineWidth = 2;
    for (const [p, q] of pairs) { ctx.beginPath(); ctx.moveTo(NODE[p].x, NODE[p].y); ctx.lineTo(NODE[q].x, NODE[q].y); ctx.stroke(); }

    // 选中过程：粗箭头 + 移动的点
    const A = NODE[pr.from], B = NODE[pr.to], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const x0 = A.x + ux * (R + 4), y0 = A.y + uy * (R + 4), x1 = B.x - ux * (R + 4), y1 = B.y - uy * (R + 4);
    ctx.strokeStyle = hc; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const ang = Math.atan2(uy, ux); ctx.fillStyle = hc; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 - 12 * Math.cos(ang - 0.4), y1 - 12 * Math.sin(ang - 0.4)); ctx.lineTo(x1 - 12 * Math.cos(ang + 0.4), y1 - 12 * Math.sin(ang + 0.4)); ctx.closePath(); ctx.fill();
    const px = x0 + (x1 - x0) * a.p, py = y0 + (y1 - y0) * a.p; ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
    // 吸热/放热标签
    ctx.fillStyle = hc; ctx.font = "700 13px system-ui"; ctx.fillText(`${pr.k}·${pr.heat}`, (x0 + x1) / 2 - 26, (y0 + y1) / 2 - 8);

    // 三态节点
    (["solid", "liquid", "gas"] as S[]).forEach((n) => {
      const { x, y, label } = NODE[n], on = n === pr.from || n === pr.to;
      ctx.fillStyle = "#eef4ff"; ctx.strokeStyle = on ? hc : "#c9d4e6"; ctx.lineWidth = on ? 3 : 2;
      ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      molecules(ctx, n, a.t, on);
      ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui"; ctx.textAlign = "center"; ctx.fillText(label, x, y + R + 16); ctx.textAlign = "left";
    });
  }

  useRafLoop((dt) => { const a = anim.current; a.t += dt / 1000; a.p = (a.p + dt / 1000 * 0.6) % 1; render(); }, true);
  useEffect(() => { render(); });

  const pr = PROC[sel];
  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PROC.map((p, i) => (
          <Button key={p.k} size="sm" variant={i === sel ? "default" : "outline"} onClick={() => { setSel(i); anim.current.p = 0; }}>{p.k}</Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground"><b>{pr.k}</b>：{NODE[pr.from].label} → {NODE[pr.to].label}，<b className={pr.heat === "吸热" ? "text-rose-500" : "text-blue-500"}>{pr.heat}</b>。例：{pr.ex}。&nbsp;（六种物态变化：熔化/汽化/升华吸热，凝固/液化/凝华放热）</p>
    </div>
  );
}
