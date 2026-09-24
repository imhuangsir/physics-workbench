"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";

const W = 560, H = 240, TX = 96, YT = 30, YB = 196, TMIN = -20, TMAX = 110;

export function ThermometerDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [temp, setTemp] = useState(25);

  const y = (t: number) => YB - ((t - TMIN) / (TMAX - TMIN)) * (YB - YT);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 管壁 + 玻璃泡
    ctx.strokeStyle = "#c3cede"; ctx.lineWidth = 12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(TX, YB); ctx.lineTo(TX, YT); ctx.stroke();
    // 液柱（红）
    const col = temp <= 0 ? C.blue : temp < 60 ? C.amber : C.rose;
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(TX, YB); ctx.lineTo(TX, y(temp)); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(TX, YB + 8, 13, 0, Math.PI * 2); ctx.fill();

    // 刻度
    ctx.strokeStyle = "#9aa4bd"; ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.lineWidth = 1;
    for (let t = TMIN; t <= TMAX; t += 20) { const yy = y(t); ctx.beginPath(); ctx.moveTo(TX + 8, yy); ctx.lineTo(TX + 14, yy); ctx.stroke(); ctx.fillText(`${t}`, TX + 18, yy + 4); }

    // 定标：冰水 0℃ / 沸水 100℃
    [[0, "冰水混合物 = 0℃", C.blue], [100, "沸水 = 100℃（标准大气压）", C.rose]].forEach(([t, label, cc]) => {
      const yy = y(t as number); ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(TX + 44, yy); ctx.lineTo(W - 20, yy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = cc as string; ctx.font = "600 12px system-ui"; ctx.fillText(label as string, TX + 50, yy - 6);
    });

    // 当前读数
    ctx.fillStyle = C.ink; ctx.font = "700 26px system-ui"; ctx.fillText(`${temp}℃`, W - 150, 60);
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText("原理：液体热胀冷缩", W - 150, 84);
    ctx.fillText("读作：摄氏度", W - 150, 102);
  }

  useEffect(() => { render(); }, [temp]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex items-center gap-3"><span className="w-16 text-sm text-muted-foreground">温度</span>
        <input type="range" min={TMIN} max={TMAX} step={1} value={temp} onChange={(e) => setTemp(Number(e.target.value))} className="flex-1" />
        <span className="w-14 text-xs text-muted-foreground">{temp}℃</span></div>
      <p className="text-xs text-muted-foreground">温度计利用<b>液体热胀冷缩</b>测温：温度越高，液柱越长。摄氏温度规定<b>冰水混合物为 0℃</b>、<b>标准大气压下沸水为 100℃</b>，中间等分。读数时视线要与液面相平。</p>
    </div>
  );
}
