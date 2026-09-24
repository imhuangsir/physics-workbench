"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 250, CX = 280, PY = 66, BL = 158, PD = 92, M = 58.4;
const WEIGHTS = [50, 20, 10, 5];

export function BalanceDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [on, setOn] = useState<Record<number, boolean>>({ 50: false, 20: false, 10: false, 5: false });
  const [rider, setRider] = useState(0);
  const right = WEIGHTS.reduce((s, w) => s + (on[w] ? w : 0), 0) + rider;
  const rr = useRef({ right, rider }); rr.current = { right, rider };
  const cur = useRef(0);

  function pan(ctx: CanvasRenderingContext2D, ex: number, ey: number) {
    ctx.strokeStyle = "#8fa3c4"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 24, ey + PD); ctx.moveTo(ex, ey); ctx.lineTo(ex + 24, ey + PD); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex - 28, ey + PD); ctx.lineTo(ex + 28, ey + PD); ctx.stroke();
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const { right: rt, rider: rd } = rr.current;
    // 倾角与质量差成正比：空盘时约 -0.3(物体侧到底)，每加一点砝码都会明显抬起一些
    const target = Math.max(-0.31, Math.min(0.31, (rt - M) / M * 0.3));
    cur.current += (target - cur.current) * 0.15;
    const a = cur.current, ca = Math.cos(a), sa = Math.sin(a);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 立柱底座
    ctx.fillStyle = "#c7d2e0"; ctx.fillRect(CX - 60, 224, 120, 12); ctx.fillRect(CX - 6, PY, 12, 158);

    // 横梁（绕支点旋转）
    const Lx = CX - BL * ca, Ly = PY - BL * sa, Rx = CX + BL * ca, Ry = PY + BL * sa;
    ctx.strokeStyle = "#5b6480"; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(Lx, Ly); ctx.lineTo(Rx, Ry); ctx.stroke();
    // 游码（沿右半横梁）
    const f = rd / 5, gx = CX + f * BL * ca, gy = PY + f * BL * sa;
    ctx.fillStyle = C.violet; ctx.beginPath(); ctx.moveTo(gx, gy - 7); ctx.lineTo(gx - 5, gy - 15); ctx.lineTo(gx + 5, gy - 15); ctx.closePath(); ctx.fill();

    pan(ctx, Lx, Ly); pan(ctx, Rx, Ry);
    // 左盘：物体
    ctx.fillStyle = C.emerald; ctx.fillRect(Lx - 18, Ly + PD - 34, 36, 32);
    ctx.fillStyle = "#fff"; ctx.font = "700 12px system-ui"; ctx.fillText("物体", Lx - 15, Ly + PD - 14);
    // 右盘：砝码堆叠
    let sy = Ry + PD - 4;
    WEIGHTS.filter((w) => on[w]).forEach((w) => { const ww = 20 + w / 3; ctx.fillStyle = C.amber; ctx.fillRect(Rx - ww / 2, sy - 13, ww, 12); ctx.fillStyle = "#5b3a02"; ctx.font = "10px system-ui"; ctx.fillText(`${w}`, Rx - 7, sy - 4); sy -= 14; });

    // 支点 + 指针
    ctx.fillStyle = "#5b6480"; ctx.beginPath(); ctx.moveTo(CX, PY - 8); ctx.lineTo(CX - 8, PY); ctx.lineTo(CX + 8, PY); ctx.closePath(); ctx.fill();
    const bal = Math.abs(rt - M) < 0.1;
    ctx.strokeStyle = bal ? C.emerald : C.rose; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(CX, PY); ctx.lineTo(CX + Math.sin(a) * 40, PY + Math.cos(a) * 40); ctx.stroke();

    ctx.fillStyle = bal ? C.emerald : C.ink; ctx.font = "700 14px system-ui";
    ctx.fillText(bal ? `平衡！质量 = 砝码 55 g + 游码 ${rd.toFixed(1)} g = ${rt.toFixed(1)} g` : rt > M ? "右盘偏重 →（减砝码/游码）" : "左盘偏重 ←（加砝码/游码）", 16, 24);
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText(`右盘合计：${rt.toFixed(1)} g`, 16, 44);
  }

  useRafLoop(() => render(), true);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap items-center gap-2">
        {WEIGHTS.map((w) => (
          <Button key={w} size="sm" variant={on[w] ? "default" : "outline"} onClick={() => setOn((o) => ({ ...o, [w]: !o[w] }))}>{w}g</Button>
        ))}
      </div>
      <div className="flex items-center gap-3"><span className="w-16 text-sm text-muted-foreground">游码</span>
        <input type="range" min={0} max={5} step={0.2} value={rider} onChange={(e) => setRider(Number(e.target.value))} className="flex-1" />
        <span className="w-12 text-xs text-muted-foreground">{rider.toFixed(1)}g</span></div>
      <p className="text-xs text-muted-foreground">加减砝码、移动游码，让指针回到中间（横梁水平）。<b>物体质量 = 右盘砝码总质量 + 游码读数</b>。试试用 <b>50g + 5g 砝码</b> 再配合游码，把这个物体称出来。</p>
    </div>
  );
}
