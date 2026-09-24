"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 250, GX0 = 224, GX1 = 540, GY0 = 210, GYT = 28;
const TMIN = -20, TMAX = 60, TSTOP = 11;

// 晶体：升温 → 0℃熔化平台(吸热不升温) → 继续升温；非晶体：连续升温无平台
function tempAt(t: number, crystal: boolean) {
  if (crystal) {
    if (t < 3) return -20 + (20 / 3) * t;
    if (t < 7) return 0;
    return Math.min(40, 10 * (t - 7));
  }
  return -20 + (80 / TSTOP) * t;
}

export function MeltingCurveDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [crystal, setCrystal] = useState(true);
  const [playing, setPlaying] = useState(false);
  const t = useRef(0);
  const cr = useRef(true); cr.current = crystal;

  const gx = (tt: number) => GX0 + (tt / TSTOP) * (GX1 - GX0);
  const gy = (T: number) => GY0 - ((T - TMIN) / (TMAX - TMIN)) * (GY0 - GYT);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const cur = t.current, crys = cr.current, T = tempAt(cur, crys);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 温度计
    const tx = 52;
    ctx.strokeStyle = "#c3cede"; ctx.lineWidth = 10; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(tx, GY0); ctx.lineTo(tx, GYT); ctx.stroke();
    const col = T <= 0 ? C.blue : T < 40 ? C.amber : C.rose;
    ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(tx, GY0); ctx.lineTo(tx, gy(T)); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(tx, GY0 + 6, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = "700 15px system-ui"; ctx.fillText(`${T.toFixed(0)}℃`, tx + 16, gy(T) + 5);

    // 状态说明
    let s = "变软中", d = "非晶体·无固定熔点";
    if (crys) {
      if (cur < 3) { s = "固态"; d = "加热升温"; }
      else if (cur < 7) { s = "固液共存"; d = "熔化中·吸热但温度不变"; }
      else { s = "液态"; d = "继续升温"; }
    }
    ctx.fillStyle = C.ink; ctx.font = "700 14px system-ui"; ctx.fillText(s, 100, 60);
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText(d, 100, 80);
    ctx.fillStyle = C.muted; ctx.fillText("🔥 持续加热", 100, 200);

    // 坐标系
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(GX0, GYT); ctx.lineTo(GX0, GY0); ctx.lineTo(GX1, GY0); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui";
    ctx.fillText("温度/℃", GX0 - 4, GYT - 10); ctx.fillText("时间", GX1 - 8, GY0 + 18);
    // 0℃(熔点)虚线
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(GX0, gy(0)); ctx.lineTo(GX1, gy(0)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.muted; ctx.fillText("0", GX0 - 14, gy(0) + 4);
    if (crys) { ctx.fillStyle = C.emerald; ctx.font = "600 11px system-ui"; ctx.fillText("熔点 0℃", GX1 - 60, gy(0) - 6); }

    // 曲线
    ctx.strokeStyle = crys ? C.violet : C.amber; ctx.lineWidth = 3; ctx.beginPath();
    for (let tt = 0; tt <= cur + 0.001; tt += 0.05) { const x = gx(tt), y = gy(tempAt(tt, crys)); tt === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = crys ? C.violet : C.amber; ctx.beginPath(); ctx.arc(gx(cur), gy(T), 5, 0, Math.PI * 2); ctx.fill();
  }

  useRafLoop((dt) => { t.current += dt / 1000; if (t.current >= TSTOP) { t.current = TSTOP; setPlaying(false); } render(); }, playing, canvasRef);
  useEffect(() => { render(); });

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={crystal ? "default" : "outline"} onClick={() => { setCrystal(true); t.current = 0; setPlaying(true); }}>晶体（冰 / 海波）</Button>
        <Button size="sm" variant={!crystal ? "default" : "outline"} onClick={() => { setCrystal(false); t.current = 0; setPlaying(true); }}>非晶体（石蜡 / 松香）</Button>
        <Button size="sm" variant="outline" onClick={() => { t.current = 0; setPlaying(true); }}>▶ 重新加热</Button>
      </div>
      <p className="text-xs text-muted-foreground"><b>晶体</b>有固定熔点，熔化时<b>吸热但温度保持不变</b>（曲线出现水平段）；<b>非晶体</b>没有固定熔点，温度持续上升、逐渐变软。</p>
    </div>
  );
}
