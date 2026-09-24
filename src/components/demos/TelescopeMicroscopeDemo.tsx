"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 228, CY = 118, OBJL = 196, EYEL = 424, EYEX = 512;

export function TelescopeMicroscopeDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [micro, setMicro] = useState(true); // true=显微镜, false=望远镜

  function lens(ctx: CanvasRenderingContext2D, x: number, half: number) {
    ctx.fillStyle = "rgba(59,130,246,0.14)"; ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, CY - half); ctx.quadraticCurveTo(x + 13, CY, x, CY + half); ctx.quadraticCurveTo(x - 13, CY, x, CY - half); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  function upArrow(ctx: CanvasRenderingContext2D, x: number, h: number, col: string) {
    ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x, CY); ctx.lineTo(x, CY - h); ctx.stroke();
    ctx.fillStyle = C.rose; ctx.beginPath(); ctx.moveTo(x, CY - h - 2); ctx.lineTo(x - 5, CY - h + 9); ctx.lineTo(x + 5, CY - h + 9); ctx.closePath(); ctx.fill();
  }
  function downArrow(ctx: CanvasRenderingContext2D, x: number, h: number, col: string) {
    ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x, CY); ctx.lineTo(x, CY + h); ctx.stroke();
    ctx.fillStyle = C.rose; ctx.beginPath(); ctx.moveTo(x, CY + h + 2); ctx.lineTo(x - 5, CY + h - 9); ctx.lineTo(x + 5, CY + h - 9); ctx.closePath(); ctx.fill();
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(16, CY); ctx.lineTo(W - 8, CY); ctx.stroke(); ctx.setLineDash([]);

    const imgX = micro ? 322 : 300, imgH = micro ? 46 : 18; // 中间像(倒立)
    lens(ctx, OBJL, 52); lens(ctx, EYEL, 44);
    ctx.fillStyle = C.muted; ctx.font = "11px system-ui";
    ctx.fillText("物镜", OBJL - 12, CY + 70); ctx.fillText("目镜", EYEL - 12, CY + 62);

    // 物体
    if (micro) { upArrow(ctx, 132, 20, C.blue); ctx.fillStyle = C.blue; ctx.font = "700 12px system-ui"; ctx.fillText("标本(近、小)", 96, CY + 20); }
    else {
      ctx.fillStyle = C.blue; ctx.font = "700 12px system-ui"; ctx.fillText("远处物体", 30, 34);
      ctx.strokeStyle = C.amber; ctx.lineWidth = 1.8;
      [-14, 14].forEach((o) => { ctx.beginPath(); ctx.moveTo(28, CY - 30 + o); ctx.lineTo(OBJL, CY + o * 0.3); ctx.stroke(); });
    }

    // 中间像(倒立)
    downArrow(ctx, imgX, imgH, C.emerald);
    ctx.fillStyle = C.emerald; ctx.font = "600 11px system-ui"; ctx.fillText("倒立实像", imgX - 22, CY + imgH + 18);

    // 目镜 → 眼(放大后送入眼睛)
    ctx.strokeStyle = C.violet; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(imgX, CY + imgH); ctx.lineTo(EYEL, CY + imgH * 0.4); ctx.lineTo(EYEX, CY - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(imgX, CY); ctx.lineTo(EYEL, CY); ctx.lineTo(EYEX, CY); ctx.stroke();
    // 眼睛
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(EYEX, CY, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(EYEX, CY, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = C.ink; ctx.font = "700 15px system-ui"; ctx.fillText(micro ? "显微镜" : "望远镜", 20, 24);
  }

  useEffect(() => { render(); }, [micro]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={micro ? "default" : "outline"} onClick={() => setMicro(true)}>显微镜</Button>
        <Button size="sm" variant={!micro ? "default" : "outline"} onClick={() => setMicro(false)}>望远镜</Button>
      </div>
      <p className="text-xs text-muted-foreground">显微镜和望远镜都由两组凸透镜组成：<b>物镜</b>先成一个<b>倒立的实像</b>，<b>目镜</b>再像放大镜一样把这个像放大。<b>显微镜</b>看近处微小物体（物镜焦距短、把小物体放大）；<b>望远镜</b>看远处物体（物镜口径大、先把远物成缩小实像，再用目镜放大）。</p>
    </div>
  );
}
