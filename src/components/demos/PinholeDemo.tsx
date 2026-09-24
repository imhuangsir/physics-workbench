"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";

const W = 560, H = 220, CY = 116, XO = 72, XH = 300, OH = 56;

export function PinholeDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [di, setDi] = useState(160); // 光屏到小孔的距离

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const doo = XH - XO, xs = XH + di, ih = OH * di / doo;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);

    // 光轴
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(24, CY); ctx.lineTo(W - 12, CY); ctx.stroke(); ctx.setLineDash([]);

    // 光线：物尖 → 小孔 → 像尖（在小孔处交叉，所以像是倒立的）
    ctx.strokeStyle = C.amber; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(XO, CY - OH); ctx.lineTo(XH, CY); ctx.lineTo(xs, CY + ih); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(XO, CY); ctx.lineTo(XH, CY); ctx.lineTo(xs, CY); ctx.stroke();

    // 物（向上的箭头，红尖）
    ctx.strokeStyle = C.blue; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(XO, CY); ctx.lineTo(XO, CY - OH); ctx.stroke();
    ctx.fillStyle = C.rose; ctx.beginPath(); ctx.moveTo(XO, CY - OH - 2); ctx.lineTo(XO - 6, CY - OH + 10); ctx.lineTo(XO + 6, CY - OH + 10); ctx.closePath(); ctx.fill();

    // 挡板 + 小孔
    ctx.strokeStyle = "#8fa3c4"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(XH, 20); ctx.lineTo(XH, CY - 6); ctx.moveTo(XH, CY + 6); ctx.lineTo(XH, H - 16); ctx.stroke();

    // 光屏 + 倒立的像（向下的箭头，红尖）
    ctx.strokeStyle = "#b7c2d6"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xs, 20); ctx.lineTo(xs, H - 16); ctx.stroke();
    ctx.strokeStyle = C.blue; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(xs, CY); ctx.lineTo(xs, CY + ih); ctx.stroke();
    ctx.fillStyle = C.rose; ctx.beginPath(); ctx.moveTo(xs, CY + ih + 2); ctx.lineTo(xs - 6, CY + ih - 10); ctx.lineTo(xs + 6, CY + ih - 10); ctx.closePath(); ctx.fill();

    // 标注
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui";
    ctx.fillText("物", XO - 6, CY - OH - 8); ctx.fillText("小孔", XH - 14, 16); ctx.fillText("倒立的像", xs - 26, 16);
    ctx.fillStyle = C.ink; ctx.font = "700 12px system-ui"; ctx.fillText(ih > OH + 1 ? "像比物大" : ih < OH - 1 ? "像比物小" : "像与物等大", 16, 26);
  }

  useEffect(() => { render(); }, [di]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex items-center gap-3"><span className="w-24 text-sm text-muted-foreground">光屏远近</span>
        <input type="range" min={70} max={250} step={1} value={di} onChange={(e) => setDi(Number(e.target.value))} className="flex-1" /></div>
      <p className="text-xs text-muted-foreground">光沿直线传播，光通过小孔后交叉，在光屏上形成<b>倒立的实像</b>。光屏离小孔越远，像越大（这跟孔的形状无关）。</p>
    </div>
  );
}
