"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 210, SX = 66, HEADX = 452, WALLX = 268, CY = 92;

export function NoiseDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [src, setSrc] = useState(false);
  const [path, setPath] = useState(false);
  const [ear, setEar] = useState(false);
  const r = useRef({ src: false, path: false, ear: false }); r.current = { src, path, ear };
  const st = useRef({ rings: [] as number[], spawn: 0 });

  const dB = () => Math.max(30, 90 - (src ? 28 : 0) - (path ? 24 : 0) - (ear ? 22 : 0));

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const { src: s0, path: p0, ear: e0 } = r.current;
    const level = Math.max(30, 90 - (s0 ? 28 : 0) - (p0 ? 24 : 0) - (e0 ? 22 : 0)), loud = (level - 30) / 60;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 声波环
    const reach = (p0 ? WALLX - SX - 6 : HEADX - SX - 34);
    for (const rr of st.current.rings) {
      if (rr > reach) continue;
      ctx.strokeStyle = C.rose; ctx.globalAlpha = (s0 ? 0.45 : 1) * Math.max(0, 1 - rr / reach) * (0.35 + 0.65 * loud); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(SX + 22, CY, rr, -0.8, 0.8); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 声源：喇叭 + 可选消声器
    ctx.fillStyle = "#2b3350"; ctx.fillRect(SX - 22, CY - 16, 20, 32);
    ctx.beginPath(); ctx.moveTo(SX - 2, CY - 16); ctx.lineTo(SX + 18, CY - 26); ctx.lineTo(SX + 18, CY + 26); ctx.lineTo(SX - 2, CY + 16); ctx.closePath(); ctx.fill();
    if (s0) {
      ctx.fillStyle = C.emerald; ctx.fillRect(SX + 18, CY - 22, 16, 44);
      ctx.fillStyle = "#e8f7f0"; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(SX + 26, CY + i * 12, 2.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText("消声器", SX + 6, CY + 42);
    }

    // 隔音墙
    if (p0) { ctx.fillStyle = "#8fa3c4"; ctx.fillRect(WALLX - 7, 20, 14, 160); ctx.fillStyle = "#6b7893"; for (let y = 30; y < 176; y += 16) ctx.fillRect(WALLX - 7, y, 14, 2); ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText("隔音墙", WALLX - 16, 194); }

    // 头 + 表情 + 耳朵
    ctx.fillStyle = "#ffe0b8"; ctx.strokeStyle = "#d9a066"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(HEADX, CY, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#d9a066"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(HEADX - 30, CY, 8, -1.4, 1.4); ctx.stroke(); // 左耳
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(HEADX - 6, CY - 6, 2.6, 0, Math.PI * 2); ctx.arc(HEADX + 12, CY - 6, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath();
    if (level > 70) ctx.arc(HEADX + 4, CY + 18, 8, Math.PI, 0); // 皱眉
    else if (level > 50) { ctx.moveTo(HEADX - 4, CY + 12); ctx.lineTo(HEADX + 12, CY + 12); }
    else ctx.arc(HEADX + 4, CY + 8, 8, 0, Math.PI); // 微笑
    ctx.stroke();
    if (e0) { // 耳罩
      ctx.strokeStyle = "#2b3350"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(HEADX, CY - 4, 34, -2.5, -0.6); ctx.stroke();
      ctx.fillStyle = "#2b3350"; ctx.fillRect(HEADX - 44, CY - 12, 16, 24);
      ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText("耳罩", HEADX - 48, CY + 40);
    }

    // 响度计（右下角）
    const mx = 366, my = 180;
    ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui"; ctx.fillText(`响度 ${level} dB`, mx, my - 6);
    ctx.fillStyle = "#dbe3ef"; ctx.fillRect(mx, my, 170, 12);
    ctx.fillStyle = level > 70 ? C.rose : level > 50 ? C.amber : C.emerald; ctx.fillRect(mx, my, 170 * loud, 12);
    ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText(level > 70 ? "很吵" : level > 50 ? "一般" : "安静", mx + 176, my + 10);
  }

  useRafLoop((dt) => {
    const s = st.current, f = dt / 1000; s.spawn += f;
    if (s.spawn > 0.5) { s.spawn = 0; s.rings.push(6); }
    for (let i = s.rings.length - 1; i >= 0; i--) { s.rings[i] += 88 * f; if (s.rings[i] > HEADX - SX) s.rings.splice(i, 1); }
    render();
  }, true, canvasRef);
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
      <p className="text-xs text-muted-foreground">噪声（分贝 dB 越大越吵）可以从三个环节控制：<b>声源处</b>（消声器、禁鸣）、<b>传播过程中</b>（隔音墙、种树）、<b>人耳处</b>（耳塞、耳罩）。打开开关看响度怎么降、表情怎么变。（当前 {dB()} dB）</p>
    </div>
  );
}
