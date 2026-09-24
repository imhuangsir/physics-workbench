"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 178, TSTOP = 3, STOTAL = 90; // 全程 90 cm
const A = { x: 62, y: 44 }, B = { x: 498, y: 150 };
const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };

export function AverageSpeedDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t1, setT1] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const t = useRef(0), passedMid = useRef(false);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const frac = (t.current / TSTOP) ** 2;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#eef2f8"; ctx.strokeStyle = "#8fa3c4"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.lineTo(A.x, B.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    ([[A, "起点"], [M, "中点"], [B, "终点"]] as const).forEach(([p, label]) => {
      ctx.strokeStyle = "#9db4d8"; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, B.y + 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText(label, p.x - 12, B.y + 16);
    });
    const px = A.x + frac * (B.x - A.x), py = A.y + frac * (B.y - A.y);
    ctx.fillStyle = C.violet; ctx.beginPath(); ctx.arc(px, py, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = "700 14px system-ui"; ctx.fillText(`计时 t = ${t.current.toFixed(2)} s`, 360, 26);
    ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText("上半程 45cm", (A.x + M.x) / 2 - 26, A.y - 6); ctx.fillText("下半程 45cm", (M.x + B.x) / 2 - 26, M.y - 6);
  }

  useRafLoop((dt) => {
    t.current += dt / 1000;
    if (!passedMid.current && (t.current / TSTOP) ** 2 >= 0.5) { passedMid.current = true; setT1(t.current); }
    if (t.current >= TSTOP) { t.current = TSTOP; setPlaying(false); setDone(true); }
    render();
  }, playing, canvasRef);
  useEffect(() => { render(); });

  function start() { t.current = 0; passedMid.current = false; setT1(null); setDone(false); setPlaying(true); }

  const half = STOTAL / 2;
  const v1 = t1 ? half / t1 : null, t2 = done && t1 ? TSTOP - t1 : null, v2 = t2 ? half / t2 : null, vAll = done ? STOTAL / TSTOP : null;
  const Row = ({ seg, s, tt, v, col }: { seg: string; s: number; tt: number | null; v: number | null; col: string }) => (
    <div className="flex items-center justify-between rounded-lg px-3 py-1.5" style={{ background: col + "1a" }}>
      <span className="font-semibold" style={{ color: col }}>{seg}</span>
      <span className="num text-muted-foreground">s={s}cm　t={tt != null ? tt.toFixed(2) : "—"}s　v = s/t = {v != null ? `${v.toFixed(1)} cm/s` : "—"}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2"><Button size="sm" onClick={start}>▶ 让小车滑下并计时</Button></div>
      <div className="space-y-1.5 text-sm">
        <Row seg="上半程" s={half} tt={t1} v={v1} col={C.blue} />
        <Row seg="下半程" s={half} tt={t2} v={v2} col={C.rose} />
        <Row seg="全程" s={STOTAL} tt={done ? TSTOP : null} v={vAll} col={C.ink} />
      </div>
      <p className="text-xs text-muted-foreground">
        {done && v1 && v2
          ? `下半程更快（v下 ${v2.toFixed(1)} > v上 ${v1.toFixed(1)} cm/s），因为小车在加速。平均速度 = 总路程 ÷ 总时间，各段的平均速度一般不同。`
          : "小车沿斜面越滑越快。点播放，看它经过中点、终点的用时，再用 v = 路程 ÷ 时间 分别算三段的平均速度。"}
      </p>
    </div>
  );
}
