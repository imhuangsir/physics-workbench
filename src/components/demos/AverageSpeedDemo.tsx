"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 236, TSTOP = 3;
const A = { x: 66, y: 58 }, B = { x: 492, y: 202 };
const S_TOTAL = 0.9; // m（斜面全程）
const T1 = TSTOP * Math.SQRT1_2, T2 = TSTOP - T1; // 匀加速下：到中点用时更久

export function AverageSpeedDemo() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(!reduce);
  const t = useRef(0);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const cur = t.current, frac = (cur / TSTOP) ** 2; // 距离 ∝ t²
    const px = A.x + frac * (B.x - A.x), py = A.y + frac * (B.y - A.y);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 斜面（直角三角形，斜边 A→B）
    ctx.fillStyle = "#eef2f8"; ctx.strokeStyle = "#8fa3c4"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(A.x, B.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
    ([[A, "起点"], [M, "中点"], [B, "终点"]] as const).forEach(([p, label]) => {
      ctx.fillStyle = C.muted; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.font = "11px system-ui"; ctx.fillText(label, p.x - 6, p.y + 16);
    });
    // 小车
    ctx.fillStyle = C.violet; ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();

    // 读数表（右上，斜边之上留白处）
    const v1 = (S_TOTAL / 2) / T1, v2 = (S_TOTAL / 2) / T2, vAll = S_TOTAL / TSTOP;
    ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui"; ctx.fillText(`t = ${cur.toFixed(2)} s`, 338, 22);
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("段     s/m  t/s   v/(m·s⁻¹)", 300, 46);
    ([["上半程", "0.45", T1, v1, C.blue], ["下半程", "0.45", T2, v2, C.rose], ["全程　", "0.90", TSTOP, vAll, C.ink]] as const)
      .forEach((r, i) => { ctx.fillStyle = r[4]; ctx.font = "600 12px system-ui"; ctx.fillText(`${r[0]}  ${r[1]}   ${(r[2] as number).toFixed(2)}   ${(r[3] as number).toFixed(2)}`, 300, 68 + i * 20); });
  }

  useRafLoop((dt) => { t.current += dt / 1000; if (t.current >= TSTOP) { t.current = TSTOP; setPlaying(false); } render(); }, playing);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => { t.current = 0; setPlaying(true); }}>▶ 让小车从斜面滑下</Button>
      </div>
      <p className="text-xs text-muted-foreground">小车沿斜面滑下越滑越快（加速）。<b>平均速度 = 总路程 ÷ 总时间</b>。同样是 0.45 m，<b>下半程用时更短、平均速度更大</b>——所以平均速度必须指明对应的是哪一段路程。</p>
    </div>
  );
}
