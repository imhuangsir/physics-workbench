"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 220, SX = 260, SURF = 48, V = 1500, DMIN = 300, DMAX = 1500;

export function SoundUsesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [d, setD] = useState(900); // 海深 m
  const dr = useRef(900); dr.current = d;
  const st = useRef({ t: 0, firing: false, done: false });

  const bedY = (dd: number) => SURF + (dd / DMAX) * 150;

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const dd = dr.current, s = st.current, by = bedY(dd), total = (2 * dd) / V;
    ctx.fillStyle = "#eaf4ff"; ctx.fillRect(0, 0, W, SURF);
    ctx.fillStyle = "#bfe0ff"; ctx.fillRect(0, SURF, W, H - SURF); // 海水
    // 船
    ctx.fillStyle = "#8a4a1e"; ctx.beginPath(); ctx.moveTo(SX - 34, SURF); ctx.lineTo(SX + 34, SURF); ctx.lineTo(SX + 22, SURF + 16); ctx.lineTo(SX - 22, SURF + 16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#5b6480"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(SX, SURF); ctx.lineTo(SX, SURF - 22); ctx.stroke();
    ctx.fillStyle = C.rose; ctx.beginPath(); ctx.moveTo(SX, SURF - 22); ctx.lineTo(SX + 16, SURF - 16); ctx.lineTo(SX, SURF - 10); ctx.closePath(); ctx.fill();
    // 海底
    ctx.fillStyle = "#c9a56b"; ctx.beginPath(); ctx.moveTo(0, by); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, by + Math.sin(x / 40) * 4); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    // 深度标注
    ctx.strokeStyle = "#6b7893"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(SX + 60, SURF); ctx.lineTo(SX + 60, by); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.ink; ctx.font = "600 12px system-ui"; ctx.fillText(`海深 = ${dd} m`, SX + 66, (SURF + by) / 2);

    // 脉冲（竖直往返）
    let phase = s.firing || s.done ? Math.min(1, s.t / total) : -1;
    if (phase >= 0) {
      const py = phase < 0.5 ? SURF + (by - SURF) * (phase / 0.5) : by - (by - SURF) * ((phase - 0.5) / 0.5);
      ctx.strokeStyle = C.rose; ctx.lineWidth = 2;
      for (let r = 5; r <= 13; r += 4) { ctx.globalAlpha = 1 - (r - 5) / 12; ctx.beginPath(); ctx.arc(SX, py, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
    }

    // 读数
    ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui"; ctx.fillText(`回声用时 t = ${(s.firing ? s.t : s.done ? total : 0).toFixed(3)} s`, 20, 78);
    if (s.done) { ctx.fillStyle = C.emerald; ctx.fillText(`海深 = ½ v t = ½ × 1500 × ${total.toFixed(3)} = ${dd} m`, 20, 100); }
    else { ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("点“发射”让声波竖直往返一次", 20, 100); }
  }

  useRafLoop((dt) => {
    const s = st.current;
    if (s.firing) { s.t += dt / 1000; const total = (2 * dr.current) / V; if (s.t >= total) { s.t = total; s.firing = false; s.done = true; } }
    render();
  }, true, canvasRef);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={() => { st.current = { t: 0, firing: true, done: false }; }}>▶ 发射</Button>
        <span className="text-sm text-muted-foreground">海深</span>
        <input type="range" min={DMIN} max={DMAX} step={50} value={d} onChange={(e) => { setD(Number(e.target.value)); st.current = { t: 0, firing: false, done: false }; }} className="flex-1 min-w-[120px]" />
        <span className="w-16 text-xs text-muted-foreground">{d} m</span>
      </div>
      <p className="text-xs text-muted-foreground"><b>声呐测海深</b>：船向海底发射声波，测出<b>回声往返的时间 t</b>，海深就是 <b>h = ½ v t</b>（声波往返走了两个海深，所以要除以 2；水中 v≈1500 m/s）。蝙蝠、倒车雷达、B 超都用了回声定位。</p>
    </div>
  );
}
