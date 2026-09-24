"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";

const W = 640, H = 150, X0 = 60, PPC = 45; // 每厘米 45px
const CM_MAX = 12;

export function RulerReadingDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [len, setLen] = useState(3.47); // cm，真实长度
  const [show, setShow] = useState(true);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    // 尺身
    ctx.fillStyle = "#fef3c7"; ctx.fillRect(X0, 82, CM_MAX * PPC, 46);
    ctx.strokeStyle = "#d6bf7a"; ctx.strokeRect(X0, 82, CM_MAX * PPC, 46);
    // 刻度
    ctx.strokeStyle = C.ink; ctx.fillStyle = C.ink; ctx.font = "11px system-ui"; ctx.textAlign = "center";
    for (let m = 0; m <= CM_MAX * 10; m++) {
      const x = X0 + m * (PPC / 10);
      const isCm = m % 10 === 0, isHalf = m % 5 === 0;
      const h = isCm ? 22 : isHalf ? 14 : 9;
      ctx.lineWidth = isCm ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(x, 82); ctx.lineTo(x, 82 + h); ctx.stroke();
      if (isCm) ctx.fillText(String(m / 10), x, 82 + 36);
    }
    ctx.textAlign = "left";
    // 被测物体（左端对齐 0）
    const xR = X0 + len * PPC;
    ctx.fillStyle = C.violet; ctx.fillRect(X0, 50, len * PPC, 20);
    ctx.fillStyle = "#c4b5fd"; ctx.fillRect(xR - 8, 50, 8, 20); // 笔尖
    // 指示末端位置
    ctx.strokeStyle = C.rose; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(xR, 46); ctx.lineTo(xR, 108); ctx.stroke(); ctx.setLineDash([]);
  }
  useEffect(render, [len, show]);

  const s = len.toFixed(2), head = s.slice(0, -1), est = s.slice(-1);
  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">拖动改变物体长度：</span>
        <input type="range" min={1} max={11.5} step={0.01} value={len} onChange={(e) => setLen(Number(e.target.value))} className="flex-1 min-w-[160px]" />
        <button className="rounded-full soft-violet px-3 py-1 text-xs font-semibold" onClick={() => setShow((v) => !v)}>{show ? "隐藏读数" : "显示读数"}</button>
      </div>
      {show ? (
        <div className="soft-blue rounded-2xl p-3 text-sm">
          <div>分度值：<b>1 mm</b>（即 0.1 cm）</div>
          <div className="mt-1">读数 = <span className="num text-lg font-extrabold">{head}<span className="text-rose-500">{est}</span></span> cm</div>
          <div className="mt-1 text-xs opacity-90">红色的末位「{est}」是<b>估读</b>的——它落在两条毫米线之间，靠估计得到，所以任何测量都有<b>误差</b>。规范读数要估读到分度值的下一位。</div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">先自己读一下（估读到 0.01 cm），再点「显示读数」核对。</p>
      )}
    </div>
  );
}
