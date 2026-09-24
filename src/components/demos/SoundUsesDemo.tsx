"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 200, EX = 60, TXMAX = 500, V = 1500, DMIN = 300, DMAX = 1500;

export function SoundUsesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [d, setD] = useState(900); // 目标距离 m
  const dr = useRef(900); dr.current = d;
  const st = useRef({ t: 0, firing: false, done: false });

  const targetX = (dd: number) => EX + (dd / DMAX) * (TXMAX - EX);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const dd = dr.current, s = st.current, tx = targetX(dd), total = (2 * dd) / V;
    ctx.fillStyle = "#e8f3ff"; ctx.fillRect(0, 0, W, H); // 水
    ctx.fillStyle = "#cfe6ff"; ctx.fillRect(0, 150, W, 50);

    // 声呐/船
    ctx.fillStyle = C.ink; ctx.fillRect(EX - 18, 30, 36, 16);
    ctx.beginPath(); ctx.moveTo(EX - 18, 46); ctx.lineTo(EX + 18, 46); ctx.lineTo(EX + 10, 58); ctx.lineTo(EX - 10, 58); ctx.closePath(); ctx.fill();
    // 目标
    ctx.fillStyle = "#6b7893"; ctx.beginPath(); ctx.ellipse(tx, 108, 16, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText("目标", tx - 12, 134);
    // 距离标注
    ctx.strokeStyle = "#9db4d8"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(EX, 80); ctx.lineTo(tx, 80); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.fillText(`s = ${dd} m`, (EX + tx) / 2 - 20, 74);

    // 脉冲
    let phase = s.firing || s.done ? s.t / total : -1;
    if (phase >= 0) {
      phase = Math.min(1, phase);
      const px = phase < 0.5 ? EX + (tx - EX) * (phase / 0.5) : tx - (tx - EX) * ((phase - 0.5) / 0.5);
      ctx.strokeStyle = C.rose; ctx.lineWidth = 2;
      for (let r = 6; r <= 14; r += 4) { ctx.globalAlpha = 1 - (r - 6) / 12; ctx.beginPath(); ctx.arc(px, 88, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }

    // 读数
    ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui";
    ctx.fillText(`回声用时 t = ${(s.firing ? s.t : s.done ? total : 0).toFixed(3)} s`, 300, 30);
    if (s.done) {
      ctx.fillStyle = C.emerald; ctx.fillText(`距离 s = ½ · v · t = ½ × 1500 × ${total.toFixed(3)}`, 300, 52);
      ctx.fillText(`     = ${dd} m`, 300, 72);
    } else {
      ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("点“发射”让声波往返一次", 300, 52);
    }
  }

  useRafLoop((dt) => {
    const s = st.current;
    if (s.firing) { s.t += dt / 1000; const total = (2 * dr.current) / V; if (s.t >= total) { s.t = total; s.firing = false; s.done = true; } }
    render();
  }, true);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => { st.current = { t: 0, firing: true, done: false }; }}>▶ 发射</Button>
        <span className="text-sm text-muted-foreground">目标距离</span>
        <input type="range" min={DMIN} max={DMAX} step={50} value={d} onChange={(e) => { setD(Number(e.target.value)); st.current = { t: 0, firing: false, done: false }; }} className="flex-1 min-w-[120px]" />
        <span className="w-16 text-xs text-muted-foreground">{d} m</span>
      </div>
      <p className="text-xs text-muted-foreground"><b>回声定位（声呐）</b>：声波遇到目标反射回来，测出往返时间 t，就能算出距离 <b>s = ½ v t</b>（v 是声速，水中约 1500 m/s）。蝙蝠、倒车雷达、B 超都用了类似原理。声还能传递能量（超声波清洗、碎结石）。</p>
    </div>
  );
}
