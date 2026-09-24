"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 210, LX = 300, CY = 100, HO = 32;
type Mode = { key: string; name: string; objX: number; imgX: number; imgH: number; real: boolean; u: string; chips: string[]; use: string };
const MODES: Mode[] = [
  { key: "camera", name: "照相机", objX: 60, imgX: 352, imgH: -16, real: true, u: "物距 u > 2f", chips: ["倒立", "缩小", "实像"], use: "拍风景、人像" },
  { key: "projector", name: "投影仪", objX: 176, imgX: 512, imgH: -80, real: true, u: "f < u < 2f", chips: ["倒立", "放大", "实像"], use: "投影片、幻灯" },
  { key: "magnifier", name: "放大镜", objX: 224, imgX: 70, imgH: 74, real: false, u: "物距 u < f", chips: ["正立", "放大", "虚像"], use: "看小字、观察细节" },
];

export function LifeLensesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState(0);

  function icon(ctx: CanvasRenderingContext2D, m: Mode) {
    ctx.strokeStyle = C.violet; ctx.fillStyle = C.violet; ctx.lineWidth = 2;
    const x = LX, y = 34;
    if (m.key === "camera") { ctx.strokeRect(x - 18, y - 10, 36, 22); ctx.beginPath(); ctx.arc(x, y + 1, 6, 0, Math.PI * 2); ctx.stroke(); ctx.fillRect(x + 8, y - 14, 8, 4); }
    else if (m.key === "projector") { ctx.strokeRect(x - 20, y - 10, 30, 22); ctx.beginPath(); ctx.moveTo(x + 10, y - 6); ctx.lineTo(x + 22, y - 12); ctx.lineTo(x + 22, y + 12); ctx.lineTo(x + 10, y + 6); ctx.closePath(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x - 4, y, 11, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 4, y + 8); ctx.lineTo(x + 16, y + 18); ctx.stroke(); }
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const m = MODES[sel];
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(16, CY); ctx.lineTo(W - 12, CY); ctx.stroke(); ctx.setLineDash([]);
    // 凸透镜
    ctx.fillStyle = "rgba(59,130,246,0.14)"; ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(LX, CY - 50); ctx.quadraticCurveTo(LX + 16, CY, LX, CY + 50); ctx.quadraticCurveTo(LX - 16, CY, LX, CY - 50); ctx.closePath(); ctx.fill(); ctx.stroke();
    icon(ctx, m);

    // 物
    ctx.strokeStyle = C.blue; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(m.objX, CY); ctx.lineTo(m.objX, CY - HO); ctx.stroke();
    ctx.fillStyle = C.rose; ctx.beginPath(); ctx.moveTo(m.objX, CY - HO - 2); ctx.lineTo(m.objX - 5, CY - HO + 9); ctx.lineTo(m.objX + 5, CY - HO + 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.blue; ctx.font = "700 12px system-ui"; ctx.fillText("物", m.objX - 4, CY + 16);

    // 像
    const icol = m.real ? C.emerald : "#7c93bd", top = CY - m.imgH; // imgH>0 正立向上; <0 倒立(top在轴下)
    ctx.strokeStyle = icol; ctx.setLineDash(m.real ? [] : [5, 4]); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(m.imgX, CY); ctx.lineTo(m.imgX, top); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = C.rose; ctx.beginPath();
    if (m.imgH < 0) { ctx.moveTo(m.imgX, top + 2); ctx.lineTo(m.imgX - 5, top - 9); ctx.lineTo(m.imgX + 5, top - 9); }
    else { ctx.moveTo(m.imgX, top - 2); ctx.lineTo(m.imgX - 5, top + 9); ctx.lineTo(m.imgX + 5, top + 9); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = icol; ctx.font = "700 12px system-ui"; ctx.fillText(m.real ? "像(实)" : "像(虚)", m.imgX - 14, m.imgH < 0 ? top - 8 : top - 8);

    // 放大镜：加只眼睛
    if (!m.real) { ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(468, CY, 9, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(468, CY, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = C.muted; ctx.font = "11px system-ui"; ctx.fillText("眼睛", 456, CY - 14); }

    // 名称 + 属性 chips
    ctx.fillStyle = C.ink; ctx.font = "700 15px system-ui"; ctx.fillText(m.name, 20, 26);
    ctx.fillStyle = C.muted; ctx.font = "12px system-ui"; ctx.fillText(m.u, 20, 44);
    m.chips.forEach((c, i) => { const x = 20 + i * 58; ctx.fillStyle = "#ede9fe"; ctx.fillRect(x, H - 30, 52, 20); ctx.fillStyle = C.violet; ctx.font = "700 12px system-ui"; ctx.fillText(c, x + 8, H - 16); });
  }

  useEffect(() => { render(); }, [sel]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        {MODES.map((m, i) => <Button key={m.key} size="sm" variant={i === sel ? "default" : "outline"} onClick={() => setSel(i)}>{m.name}</Button>)}
      </div>
      <p className="text-xs text-muted-foreground">三者都用<b>凸透镜</b>，物体离透镜远近不同，成的像也不同：<b>{MODES[sel].name}</b>（{MODES[sel].u}）成 <b>{MODES[sel].chips.join("、")}</b>，用于{MODES[sel].use}。物体越靠近焦点，像越大。（精确规律见下一节）</p>
    </div>
  );
}
