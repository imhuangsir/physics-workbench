"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 216, CX = 268, CY = 108, F = 130, X1 = 540;
const YS = [-48, -24, 24, 48];

export function LensRaysDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [convex, setConvex] = useState(true);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    // 光轴
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(20, CY); ctx.lineTo(X1, CY); ctx.stroke(); ctx.setLineDash([]);

    // 透镜形状
    ctx.fillStyle = "rgba(59,130,246,0.14)"; ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
    if (convex) {
      ctx.beginPath(); ctx.moveTo(CX, CY - 52); ctx.quadraticCurveTo(CX + 20, CY, CX, CY + 52); ctx.quadraticCurveTo(CX - 20, CY, CX, CY - 52); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(CX - 15, CY - 52); ctx.lineTo(CX + 15, CY - 52); ctx.quadraticCurveTo(CX - 4, CY, CX + 15, CY + 52);
      ctx.lineTo(CX - 15, CY + 52); ctx.quadraticCurveTo(CX + 4, CY, CX - 15, CY - 52); ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    // 平行光线
    ctx.lineWidth = 2;
    YS.forEach((dy) => {
      const y = CY + dy;
      ctx.strokeStyle = C.amber; ctx.beginPath(); ctx.moveTo(28, y); ctx.lineTo(CX, y); ctx.stroke(); // 入射（平行）
      if (convex) { // 会聚到右侧焦点 F
        const Fx = CX + F, t = (X1 - CX) / (Fx - CX), ey = y + (CY - y) * t;
        ctx.beginPath(); ctx.moveTo(CX, y); ctx.lineTo(X1, ey); ctx.stroke();
      } else { // 发散，反向延长线过左侧虚焦点 F'
        const Fx = CX - F, dirx = CX - Fx, diry = y - CY, t = (X1 - CX) / dirx;
        ctx.beginPath(); ctx.moveTo(CX, y); ctx.lineTo(X1, y + diry * t); ctx.stroke();
        ctx.strokeStyle = "#e3b778"; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(CX, y); ctx.lineTo(Fx, CY); ctx.stroke(); ctx.setLineDash([]);
      }
    });

    // 焦点
    const fx = convex ? CX + F : CX - F;
    ctx.fillStyle = convex ? C.rose : "#9db4d8"; ctx.beginPath(); ctx.arc(fx, CY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.font = "700 12px system-ui"; ctx.fillText(convex ? "焦点 F（实）" : "虚焦点 F", fx - 20, CY + 22);
    ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui"; ctx.fillText(convex ? "凸透镜：会聚光线" : "凹透镜：发散光线", 30, 26);
  }

  useEffect(() => { render(); }, [convex]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={convex ? "default" : "outline"} onClick={() => setConvex(true)}>凸透镜（中间厚）</Button>
        <Button size="sm" variant={!convex ? "default" : "outline"} onClick={() => setConvex(false)}>凹透镜（中间薄）</Button>
      </div>
      <p className="text-xs text-muted-foreground"><b>凸透镜</b>对光有<b>会聚</b>作用，平行光会聚到焦点；<b>凹透镜</b>对光有<b>发散</b>作用，平行光发散后，反向延长线交于虚焦点。</p>
    </div>
  );
}
