"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, C } from "./canvas";

const W = 560, H = 232, CX = 232, CY = 118, F = 62, HO = 46, X1 = 548;

export function ConvexImagingDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [u, setU] = useState(150); // 物距

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    const L = (a: { x: number; y: number }, b: { x: number; y: number }, col: string, dash = false) => {
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash ? [5, 4] : []);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    };
    const edge = (s: { x: number; y: number }, dx: number, dy: number) => ({ x: X1, y: s.y + dy * (X1 - s.x) / dx });

    // 光轴 + 透镜 + 焦点刻度
    ctx.strokeStyle = "#cfd8e6"; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(16, CY); ctx.lineTo(X1, CY); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "rgba(59,130,246,0.14)"; ctx.strokeStyle = C.blue; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CX, CY - 58); ctx.quadraticCurveTo(CX + 18, CY, CX, CY + 58); ctx.quadraticCurveTo(CX - 18, CY, CX, CY - 58); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.muted; ctx.font = "11px system-ui";
    [[-2, "2F"], [-1, "F"], [1, "F"], [2, "2F"]].forEach(([k, t]) => { const x = CX + (k as number) * F; ctx.fillRect(x, CY - 4, 1.5, 8); ctx.fillText(t as string, x - 5, CY + 20); });

    const xo = CX - u, T = { x: xo, y: CY - HO }, A1 = { x: CX, y: CY - HO }, O = { x: CX, y: CY }, Fr = { x: CX + F, y: CY };
    const noImg = Math.abs(u - F) < 3;
    // 物（蓝箭头，红尖）
    L({ x: xo, y: CY }, { x: xo, y: CY - HO }, C.blue);
    ctx.fillStyle = C.rose; ctx.beginPath(); ctx.moveTo(xo, CY - HO - 2); ctx.lineTo(xo - 5, CY - HO + 9); ctx.lineTo(xo + 5, CY - HO + 9); ctx.closePath(); ctx.fill();

    L(T, A1, C.amber); // 平行入射
    let nat = "u = f：折射光平行，不成像", app = "";
    if (noImg) {
      const d1 = edge(A1, Fr.x - A1.x, Fr.y - A1.y); L(A1, d1, C.amber);
      const e2 = edge(O, O.x - T.x, O.y - T.y); L(T, e2, C.rose);
    } else {
      const v = u * F / (u - F), real = v > 0, hi = HO * Math.abs(v) / u, xi = CX + v, yi = real ? CY + hi : CY - hi, P = { x: xi, y: yi };
      if (real) { L(A1, P, C.amber); L(T, P, C.rose); }
      else {
        L(A1, edge(A1, Fr.x - A1.x, Fr.y - A1.y), C.amber); L(A1, P, "#e3b778", true);
        L(T, edge(O, O.x - T.x, O.y - T.y), C.rose); L(O, P, "#f0a4b0", true);
      }
      // 像
      const icol = real ? C.emerald : "#7c93bd";
      L({ x: xi, y: CY }, { x: xi, y: yi }, icol, !real);
      ctx.fillStyle = icol; ctx.beginPath();
      if (real) { ctx.moveTo(xi, yi + 2); ctx.lineTo(xi - 5, yi - 9); ctx.lineTo(xi + 5, yi - 9); }
      else { ctx.moveTo(xi, yi - 2); ctx.lineTo(xi - 5, yi + 9); ctx.lineTo(xi + 5, yi + 9); }
      ctx.closePath(); ctx.fill();
      const big = Math.abs(v) / u > 1;
      if (real) { nat = `倒立、${big ? "放大" : Math.abs(Math.abs(v) / u - 1) < 0.08 ? "等大" : "缩小"}的实像`; app = u > 2 * F ? "→ 照相机" : Math.abs(u - 2 * F) < 6 ? "" : "→ 投影仪"; }
      else { nat = "正立、放大的虚像"; app = "→ 放大镜"; }
    }
    ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui"; ctx.fillText(nat, 16, 24);
    ctx.fillStyle = C.violet; ctx.fillText(app, 16, 42);
  }

  useEffect(() => { render(); }, [u]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex items-center gap-3"><span className="w-20 text-sm text-muted-foreground">物距 u</span>
        <input type="range" min={24} max={210} step={1} value={u} onChange={(e) => setU(Number(e.target.value))} className="flex-1" />
        <span className="w-16 text-xs text-muted-foreground">{u > 2 * F ? "u>2F" : u > F + 3 ? "F<u<2F" : Math.abs(u - F) <= 3 ? "u≈F" : "u<F"}</span></div>
      <p className="text-xs text-muted-foreground">拖动物距看成像规律：<b>u&gt;2F</b> 倒立缩小实像（照相机）；<b>F&lt;u&lt;2F</b> 倒立放大实像（投影仪）；<b>u&lt;F</b> 正立放大虚像（放大镜）。口诀：<b>一倍焦距分虚实，二倍焦距分大小</b>。</p>
    </div>
  );
}
