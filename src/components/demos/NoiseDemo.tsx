"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 200, SX = 74, EARX = 476, WALLX = 272, CY = 96;

export function NoiseDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [src, setSrc] = useState(false);   // 声源处减弱（消声器）
  const [path, setPath] = useState(false); // 传播过程减弱（隔音墙）
  const [ear, setEar] = useState(false);   // 人耳处减弱（耳罩）
  const r = useRef({ src: false, path: false, ear: false }); r.current = { src, path, ear };
  const st = useRef({ rings: [] as number[], spawn: 0 });

  const db = () => Math.max(30, 90 - (src ? 30 : 0) - (path ? 25 : 0) - (ear ? 20 : 0));

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const { src: s0, path: p0, ear: e0 } = r.current;
    const level = Math.max(30, 90 - (s0 ? 30 : 0) - (p0 ? 25 : 0) - (e0 ? 20 : 0));
    const loud = (level - 30) / 60; // 0..1
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 声波环（传播减弱则被隔音墙挡住）
    const maxReach = p0 ? WALLX - SX - 8 : EARX - SX - 14;
    for (const rr of st.current.rings) {
      if (rr > maxReach) continue;
      ctx.strokeStyle = C.rose; ctx.globalAlpha = (s0 ? 0.5 : 1) * Math.max(0, 1 - rr / maxReach) * (0.4 + 0.6 * loud);
      ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(SX, CY, rr, -0.9, 0.9); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 声源（喇叭）+ 消声器
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(SX - 20, CY - 12); ctx.lineTo(SX - 6, CY - 12); ctx.lineTo(SX + 6, CY - 22); ctx.lineTo(SX + 6, CY + 22); ctx.lineTo(SX - 6, CY + 12); ctx.lineTo(SX - 20, CY + 12); ctx.closePath(); ctx.fill();
    if (s0) { ctx.fillStyle = C.emerald; ctx.fillRect(SX + 8, CY - 16, 8, 32); ctx.fillStyle = C.muted; ctx.font = "10px system-ui"; ctx.fillText("消声器", SX - 14, CY + 40); }

    // 隔音墙
    if (p0) { ctx.fillStyle = "#8fa3c4"; ctx.fillRect(WALLX - 6, 24, 12, 150); ctx.fillStyle = C.muted; ctx.font = "10px system-ui"; ctx.fillText("隔音墙", WALLX - 16, 190); }

    // 人耳 + 耳罩
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(EARX, CY, 12, -1.3, 1.9); ctx.stroke();
    if (e0) { ctx.strokeStyle = C.emerald; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(EARX, CY, 20, -1.2, 1.2); ctx.stroke(); ctx.fillStyle = C.muted; ctx.font = "10px system-ui"; ctx.fillText("耳罩", EARX - 12, CY + 42); }
    // 表情
    ctx.font = "22px system-ui"; ctx.fillText(level > 70 ? "😖" : level > 50 ? "😐" : "🙂", EARX - 12, CY - 26);

    // 分贝计
    ctx.fillStyle = C.ink; ctx.font = "700 15px system-ui"; ctx.fillText(`${level} dB`, 250, 30);
    ctx.fillStyle = "#dbe3ef"; ctx.fillRect(250, 40, 160, 12);
    ctx.fillStyle = level > 70 ? C.rose : level > 50 ? C.amber : C.emerald; ctx.fillRect(250, 40, 160 * loud, 12);
    ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText(level > 70 ? "很吵" : level > 50 ? "一般" : "安静", 250, 66);
  }

  useRafLoop((dt) => {
    const s = st.current, f = dt / 1000; s.spawn += f;
    if (s.spawn > 0.5) { s.spawn = 0; s.rings.push(6); }
    for (let i = s.rings.length - 1; i >= 0; i--) { s.rings[i] += 90 * f; if (s.rings[i] > EARX - SX) s.rings.splice(i, 1); }
    render();
  }, true);
  useEffect(() => { render(); });

  const Toggle = ({ on, set, label }: { on: boolean; set: (b: boolean) => void; label: string }) => (
    <Button size="sm" variant={on ? "default" : "outline"} onClick={() => set(!on)}>{on ? "✓ " : ""}{label}</Button>
  );

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Toggle on={src} set={setSrc} label="在声源处减弱" />
        <Toggle on={path} set={setPath} label="在传播过程中减弱" />
        <Toggle on={ear} set={setEar} label="在人耳处减弱" />
      </div>
      <p className="text-xs text-muted-foreground">噪声（分贝 dB 越大越吵）可以从三个环节控制：<b>在声源处</b>（消声器、禁鸣）、<b>在传播过程中</b>（隔音墙、种树）、<b>在人耳处</b>（耳塞、耳罩）。打开开关看分贝怎么降下来。（当前 {db()} dB）</p>
    </div>
  );
}
