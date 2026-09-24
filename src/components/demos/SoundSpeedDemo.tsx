"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 200, START = 118, END = 532, K = 0.075, TSTOP = 4.4;
const MEDIA = [
  { name: "钢铁", v: 5000, color: C.emerald },
  { name: "水", v: 1500, color: C.blue },
  { name: "空气", v: 340, color: C.amber },
];

export function SoundSpeedDemo() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(!reduce);
  const t = useRef(0);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const cur = t.current;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("起点", START - 16, 24); ctx.fillText("终点", END - 16, 24);
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(START, 28); ctx.lineTo(START, 180); ctx.moveTo(END, 28); ctx.lineTo(END, 180); ctx.stroke(); ctx.setLineDash([]);
    MEDIA.forEach((m, i) => {
      const y = 52 + i * 46;
      ctx.strokeStyle = "#e2e8f2"; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(START, y); ctx.lineTo(END, y); ctx.stroke();
      const x = Math.min(END, START + m.v * K * cur);
      ctx.strokeStyle = m.color; ctx.beginPath(); ctx.moveTo(START, y); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = m.color; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui"; ctx.fillText(m.name, 8, y - 8);
      ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText(`${m.v} m/s`, 46, y - 8);
      if (x >= END) { ctx.fillStyle = m.color; ctx.font = "700 13px system-ui"; ctx.fillText(`✓ 第${i + 1}`, END + 4, y + 4); }
    });
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText(`t = ${cur.toFixed(2)} s`, W - 84, 24);
  }

  useRafLoop((dt) => { t.current += dt / 1000; if (t.current >= TSTOP) { t.current = TSTOP; setPlaying(false); } render(); }, playing);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => { t.current = 0; setPlaying(true); }}>▶ 同时发声，看谁先到</Button>
      </div>
      <p className="text-xs text-muted-foreground">同样的距离，声音在钢铁里传得最快、水里其次、空气里最慢——<b>声速跟介质有关，一般固体 &gt; 液体 &gt; 气体</b>。（15℃ 空气中约 340 m/s）</p>
    </div>
  );
}
