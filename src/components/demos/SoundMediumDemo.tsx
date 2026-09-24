"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";

const W = 560, H = 240, CX = 220, BY = 176;
const DOTS = Array.from({ length: 44 }, (_, i) => ({ x: CX - 88 + ((i * 53) % 176), y: 78 + ((i * 41) % 104), p: i }));

export function SoundMediumDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [air, setAir] = useState(1);
  const airRef = useRef(1); airRef.current = air;
  const st = useRef({ rings: [] as number[], spawn: 0, t: 0 });

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const s = st.current, a = airRef.current;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    // 声波（响度/传播距离 ∝ 空气）
    const reach = 30 + a * 150;
    for (const r of s.rings) {
      ctx.strokeStyle = C.blue; ctx.globalAlpha = a * Math.max(0, 1 - r / reach); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(CX, BY - 6, r, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // 空气分子（点）
    ctx.fillStyle = "#9db4d8";
    const n = Math.round(a * DOTS.length);
    for (let i = 0; i < n; i++) { const d = DOTS[i]; ctx.beginPath(); ctx.arc(d.x + Math.sin(s.t * 3 + d.p) * 2, d.y + Math.cos(s.t * 2 + d.p) * 2, 2.4, 0, Math.PI * 2); ctx.fill(); }
    // 玻璃罩
    ctx.strokeStyle = "#8fa3c4"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(CX - 100, 200); ctx.lineTo(CX - 100, 96); ctx.arc(CX, 96, 100, Math.PI, 0); ctx.lineTo(CX + 100, 200); ctx.stroke();
    ctx.fillStyle = "#c7d2e0"; ctx.fillRect(CX - 116, 200, 232, 12); // 底座
    // 铃铛（一直振动）
    const vib = Math.sin(s.t * 26) * 2;
    ctx.fillStyle = C.amber; ctx.beginPath();
    ctx.moveTo(CX - 16 + vib, BY); ctx.lineTo(CX + 16 + vib, BY); ctx.lineTo(CX + 11 + vib, BY - 26); ctx.arc(CX + vib, BY - 26, 11, 0, Math.PI, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#7c4a03"; ctx.fillRect(CX - 2 + vib, BY, 4, 6);
    // 响度计
    ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui"; ctx.fillText("能听到的响度", 400, 40);
    for (let i = 0; i < 5; i++) {
      const lit = a * 5 > i;
      ctx.fillStyle = lit ? C.emerald : "#d9e0ea";
      ctx.fillRect(400, 150 - i * 22, 22 + i * 8, 16);
    }
    ctx.fillStyle = a < 0.02 ? C.rose : C.muted; ctx.font = "600 13px system-ui";
    ctx.fillText(a < 0.02 ? "真空：听不到！" : `空气 ${Math.round(a * 100)}%`, 400, 175);
  }

  useRafLoop((dt) => {
    const s = st.current, f = dt / 1000, a = airRef.current; s.t += f;
    const reach = 30 + a * 150;
    for (let i = s.rings.length - 1; i >= 0; i--) { s.rings[i] += 90 * f; if (s.rings[i] > reach) s.rings.splice(i, 1); }
    if (a > 0.02) { s.spawn += f; if (s.spawn > 0.6) { s.spawn = 0; s.rings.push(6); } } else s.rings.length = 0;
    render();
  }, true, canvasRef);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">抽气 ← 空气含量 → 充气：</span>
        <input type="range" min={0} max={1} step={0.01} value={air} onChange={(e) => setAir(Number(e.target.value))} className="flex-1 min-w-[160px]" />
      </div>
      <p className="text-xs text-muted-foreground">铃铛一直在振动，但声音要靠<b>介质</b>（空气等）才能传出去。把罩里的空气抽走，声波传不出来、响度降到 0——<b>真空不能传声</b>。</p>
    </div>
  );
}
