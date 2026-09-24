"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 226, CY = 108, OBJL = 196, EYEL = 410, EYEX = 508;

export function TelescopeMicroscopeDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [micro, setMicro] = useState(true);

  function lens(ctx: CanvasRenderingContext2D, x: number, half: number, label: string) {
    ctx.fillStyle = "rgba(59,130,246,0.14)"; ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, CY - half); ctx.quadraticCurveTo(x + 12, CY, x, CY + half); ctx.quadraticCurveTo(x - 12, CY, x, CY - half); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText(label, x - 12, CY + half + 16);
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(16, CY); ctx.lineTo(W - 8, CY); ctx.stroke(); ctx.setLineDash([]);

    const imgX = micro ? 300 : 288, imgH = micro ? 44 : 16, imgTop = CY + imgH; // 中间像(倒立)
    lens(ctx, OBJL, 50, "物镜"); lens(ctx, EYEL, 42, "目镜");

    // ① 物镜成像的光线
    ctx.strokeStyle = C.amber; ctx.lineWidth = 1.6;
    if (micro) {
      const oT = { x: 116, y: CY - 18 };
      ctx.fillStyle = C.blue; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(oT.x, CY); ctx.lineTo(oT.x, oT.y); ctx.stroke();
      ctx.fillStyle = C.rose; ctx.beginPath(); ctx.moveTo(oT.x, oT.y - 2); ctx.lineTo(oT.x - 4, oT.y + 8); ctx.lineTo(oT.x + 4, oT.y + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.blue; ctx.font = "700 11px system-ui"; ctx.fillText("标本(近、小)", 78, CY + 18);
      ctx.strokeStyle = C.amber; ctx.lineWidth = 1.6;
      [-14, 14].forEach((o) => { ctx.beginPath(); ctx.moveTo(oT.x, oT.y); ctx.lineTo(OBJL, CY + o); ctx.lineTo(imgX, imgTop); ctx.stroke(); });
    } else {
      ctx.fillStyle = C.blue; ctx.font = "700 11px system-ui"; ctx.fillText("远处物体（很远）", 24, 30);
      [-12, 12].forEach((o) => { ctx.beginPath(); ctx.moveTo(26, CY - 26 + o); ctx.lineTo(OBJL, CY + o); ctx.lineTo(imgX, imgTop); ctx.stroke(); });
    }

    // 中间像(倒立)
    ctx.strokeStyle = C.emerald; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(imgX, CY); ctx.lineTo(imgX, imgTop); ctx.stroke();
    ctx.fillStyle = C.rose; ctx.beginPath(); ctx.moveTo(imgX, imgTop + 2); ctx.lineTo(imgX - 4, imgTop - 8); ctx.lineTo(imgX + 4, imgTop - 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.emerald; ctx.font = "600 11px system-ui"; ctx.fillText("物镜成的像(倒立)", imgX - 44, imgTop + 16);

    // ② 目镜 → 眼睛
    ctx.strokeStyle = C.violet; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(imgX, imgTop); ctx.lineTo(EYEL, CY + imgH * 0.35); ctx.lineTo(EYEX, CY - 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(imgX, CY); ctx.lineTo(EYEL, CY); ctx.lineTo(EYEX, CY); ctx.stroke();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(EYEX, CY, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(EYEX, CY, 3, 0, Math.PI * 2); ctx.fill();

    // 标题 + 两步说明
    ctx.fillStyle = C.ink; ctx.font = "700 15px system-ui"; ctx.fillText(micro ? "显微镜" : "望远镜", W - 90, 24);
    ctx.fillStyle = C.amber; ctx.font = "700 12px system-ui"; ctx.fillText("① 物镜成倒立实像", 210, 200);
    ctx.fillStyle = C.violet; ctx.fillText("② 目镜再放大", 400, 200);
  }

  useEffect(() => { render(); }, [micro]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={micro ? "default" : "outline"} onClick={() => setMicro(true)}>显微镜</Button>
        <Button size="sm" variant={!micro ? "default" : "outline"} onClick={() => setMicro(false)}>望远镜</Button>
      </div>
      <p className="text-xs text-muted-foreground">两者都由两组凸透镜组成，分两步：<b>①物镜</b>先把物体成一个<b>倒立的实像</b>，<b>②目镜</b>再像放大镜一样把这个像放大送入眼睛。<b>显微镜</b>看很近的微小物体（标本贴近物镜）；<b>望远镜</b>看很远的物体（远处来的光近似平行，物镜先成一个缩小的实像）。</p>
    </div>
  );
}
