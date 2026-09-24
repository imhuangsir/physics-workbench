"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 216, EX = 342, CY = 110, ER = 66, LX = EX - ER + 16, RETX = EX + ER - 4;
type Mode = "正常" | "近视" | "远视";

export function EyeCorrectionDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("近视");
  const [glass, setGlass] = useState(true);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    const fixed = mode === "正常" || glass;
    const Fx = mode === "正常" ? RETX : fixed ? RETX : mode === "近视" ? EX + 4 : EX + ER + 44;

    // 眼球
    ctx.fillStyle = "#fdfdff"; ctx.strokeStyle = "#8fa3c4"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(EX, CY, ER, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 视网膜（后壁）
    ctx.strokeStyle = C.rose; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(EX, CY, ER - 4, -0.7, 0.7); ctx.stroke();
    ctx.fillStyle = C.rose; ctx.font = "11px system-ui"; ctx.fillText("视网膜", RETX - 6, CY - ER + 22);
    // 晶状体
    ctx.fillStyle = "rgba(59,130,246,0.2)"; ctx.strokeStyle = C.blue; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(LX, CY, 8, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // 矫正眼镜
    if (mode !== "正常" && glass) {
      const gx = EX - ER - 26;
      ctx.strokeStyle = C.violet; ctx.lineWidth = 2.5;
      if (mode === "近视") { // 凹透镜
        ctx.beginPath(); ctx.moveTo(gx - 9, CY - 30); ctx.lineTo(gx + 9, CY - 30); ctx.quadraticCurveTo(gx - 2, CY, gx + 9, CY + 30); ctx.lineTo(gx - 9, CY + 30); ctx.quadraticCurveTo(gx + 2, CY, gx - 9, CY - 30); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = C.violet; ctx.font = "11px system-ui"; ctx.fillText("凹透镜", gx - 16, CY + 46);
      } else { // 凸透镜
        ctx.beginPath(); ctx.moveTo(gx, CY - 30); ctx.quadraticCurveTo(gx + 11, CY, gx, CY + 30); ctx.quadraticCurveTo(gx - 11, CY, gx, CY - 30); ctx.closePath(); ctx.stroke();
        ctx.fillStyle = C.violet; ctx.font = "11px system-ui"; ctx.fillText("凸透镜", gx - 16, CY + 46);
      }
    }

    // 光线（远处平行光 → 会聚）
    [-24, 24].forEach((dy) => {
      ctx.strokeStyle = C.amber; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(40, CY + dy); ctx.lineTo(LX, CY + dy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(LX, CY + dy); ctx.lineTo(Fx, CY); ctx.stroke();
      if (Fx < RETX - 2) { ctx.strokeStyle = "#e3b778"; ctx.beginPath(); ctx.moveTo(Fx, CY); ctx.lineTo(RETX, CY + dy * 0.5); ctx.stroke(); } // 会聚后再发散到视网膜
    });

    // 焦点 + 判定
    const clear = Math.abs(Fx - RETX) < 6;
    ctx.fillStyle = clear ? C.emerald : C.rose; ctx.beginPath(); ctx.arc(Math.min(Fx, W - 10), CY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.font = "700 14px system-ui"; ctx.fillText(clear ? "✓ 会聚在视网膜上 → 看得清" : mode === "近视" ? "✗ 会聚在视网膜前 → 看不清" : "✗ 会聚在视网膜后 → 看不清", 16, 26);
  }

  useEffect(() => { render(); }, [mode, glass]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        {(["正常", "近视", "远视"] as Mode[]).map((m) => (
          <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} onClick={() => setMode(m)}>{m}眼</Button>
        ))}
        <Button size="sm" variant={mode !== "正常" && glass ? "default" : "outline"} disabled={mode === "正常"} onClick={() => setGlass((g) => !g)}>{mode === "正常" ? "无需矫正镜" : glass ? "已戴矫正镜" : "未戴眼镜"}</Button>
      </div>
      <p className="text-xs text-muted-foreground"><b>近视眼</b>像成在视网膜<b>前</b>（眼球偏长），用<b>凹透镜</b>矫正；<b>远视眼</b>像成在视网膜<b>后</b>（眼球偏短），用<b>凸透镜</b>矫正。切换上面的按钮，戴/摘眼镜看焦点怎么移回视网膜。</p>
    </div>
  );
}
