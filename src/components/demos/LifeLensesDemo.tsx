"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 220, CX = 268, CY = 112, HO = 34;
type Mode = { key: string; name: string; objX: number; imgX: number; hi: number; real: boolean; desc: string };
const MODES: Mode[] = [
  { key: "camera", name: "照相机", objX: CX - 168, imgX: CX + 66, hi: 16, real: true, desc: "物体较远(u>2f)：倒立、缩小的实像，成在胶片/感光元件上" },
  { key: "projector", name: "投影仪", objX: CX - 96, imgX: CX + 190, hi: 74, real: true, desc: "物体较近(f<u<2f)：倒立、放大的实像；投影片要倒着放" },
  { key: "magnifier", name: "放大镜", objX: CX - 70, imgX: CX - 176, hi: 70, real: false, desc: "物体在焦点内(u<f)：正立、放大的虚像" },
];

export function LifeLensesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState(0);

  function arrow(ctx: CanvasRenderingContext2D, x: number, top: number, up: boolean, col: string, dash: boolean) {
    ctx.strokeStyle = col; ctx.setLineDash(dash ? [5, 4] : []); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, CY); ctx.lineTo(x, top); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.rose; ctx.beginPath();
    if (up) { ctx.moveTo(x, top - 2); ctx.lineTo(x - 5, top + 9); ctx.lineTo(x + 5, top + 9); }
    else { ctx.moveTo(x, top + 2); ctx.lineTo(x - 5, top - 9); ctx.lineTo(x + 5, top - 9); }
    ctx.closePath(); ctx.fill();
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const m = MODES[sel];
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(16, CY); ctx.lineTo(W - 12, CY); ctx.stroke(); ctx.setLineDash([]);
    // 凸透镜
    ctx.fillStyle = "rgba(59,130,246,0.14)"; ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CX, CY - 56); ctx.quadraticCurveTo(CX + 17, CY, CX, CY + 56); ctx.quadraticCurveTo(CX - 17, CY, CX, CY - 56); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 物
    arrow(ctx, m.objX, CY - HO, true, C.blue, false);
    ctx.fillStyle = C.blue; ctx.font = "700 12px system-ui"; ctx.fillText("物", m.objX - 4, CY + 18);
    // 像
    const icol = m.real ? C.emerald : "#7c93bd";
    arrowImage(ctx, m, icol);
    ctx.fillStyle = icol; ctx.font = "700 12px system-ui"; ctx.fillText(m.real ? "实像" : "虚像", m.imgX - 8, m.real ? CY + m.hi + 20 : CY - m.hi - 10);
    // 器件名
    ctx.fillStyle = C.ink; ctx.font = "700 15px system-ui"; ctx.fillText(m.name, 20, 28);
  }

  function arrowImage(ctx: CanvasRenderingContext2D, m: Mode, col: string) {
    const top = m.real ? CY + m.hi : CY - m.hi;
    ctx.strokeStyle = col; ctx.setLineDash(m.real ? [] : [5, 4]); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(m.imgX, CY); ctx.lineTo(m.imgX, top); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.rose; ctx.beginPath();
    if (m.real) { ctx.moveTo(m.imgX, top + 2); ctx.lineTo(m.imgX - 5, top - 9); ctx.lineTo(m.imgX + 5, top - 9); }
    else { ctx.moveTo(m.imgX, top - 2); ctx.lineTo(m.imgX - 5, top + 9); ctx.lineTo(m.imgX + 5, top + 9); }
    ctx.closePath(); ctx.fill();
  }

  useEffect(() => { render(); }, [sel]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        {MODES.map((m, i) => <Button key={m.key} size="sm" variant={i === sel ? "default" : "outline"} onClick={() => setSel(i)}>{m.name}</Button>)}
      </div>
      <p className="text-xs text-muted-foreground">生活中的透镜都用<b>凸透镜</b>：<b>{MODES[sel].name}</b> —— {MODES[sel].desc}。物体离透镜越近，像越大（下一节的成像规律会精确说明）。</p>
    </div>
  );
}
