"use client";
import { useEffect, useRef } from "react";
import { fitCanvas, C } from "./canvas";

const W = 560, H = 210;
const SPECTRUM = [
  { name: "红", c: "#e5484d" }, { name: "橙", c: "#f76b15" }, { name: "黄", c: "#f5d90a" },
  { name: "绿", c: "#30a46c" }, { name: "蓝", c: "#0091ff" }, { name: "靛", c: "#3a5bdb" }, { name: "紫", c: "#8e4ec6" },
];

export function DispersionDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    ctx.fillStyle = "#20263a"; ctx.fillRect(0, 0, W, H); // 深色底更能看清色光

    // 入射白光
    const inx = 268, iny = 98;
    ctx.strokeStyle = "#f4f7fc"; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(40, 112); ctx.lineTo(inx, iny); ctx.stroke();
    ctx.fillStyle = "#dfe7f3"; ctx.font = "12px system-ui"; ctx.fillText("白光", 60, 100);

    // 三棱镜
    ctx.fillStyle = "rgba(200,215,240,0.18)"; ctx.strokeStyle = "#aab6d0"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(300, 46); ctx.lineTo(248, 156); ctx.lineTo(352, 156); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#aab6d0"; ctx.fillText("三棱镜", 276, 176);

    // 棱镜内白光
    const outx = 324, outy = 106;
    ctx.strokeStyle = "#f4f7fc"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(inx, iny); ctx.lineTo(outx, outy); ctx.stroke();

    // 出射：七色散开射向光屏
    const sx = 512;
    SPECTRUM.forEach((s, i) => {
      const y = 74 + i * 12.5;
      ctx.strokeStyle = s.c; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(outx, outy); ctx.lineTo(sx, y); ctx.stroke();
    });

    // 光屏上的光谱带
    SPECTRUM.forEach((s, i) => {
      const y = 74 + i * 12.5; ctx.fillStyle = s.c; ctx.fillRect(sx, y - 6, 30, 12);
      ctx.fillStyle = "#dfe7f3"; ctx.font = "11px system-ui"; ctx.fillText(s.name, sx + 34, y + 4);
    });
    ctx.fillStyle = "#aab6d0"; ctx.font = "12px system-ui"; ctx.fillText("光屏", sx - 4, 60);
  }

  useEffect(() => { render(); }, []);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <p className="text-xs text-muted-foreground">白光通过三棱镜后被分解成<b>红、橙、黄、绿、蓝、靛、紫</b>七种色光，这叫<b>光的色散</b>。它说明<b>白光不是单色光，而是由各种色光混合而成的</b>。（雨后彩虹就是阳光被小水珠色散形成的）</p>
    </div>
  );
}
