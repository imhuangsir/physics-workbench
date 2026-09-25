"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop } from "@/components/demos/canvas";

const W = 340, H = 400, R = 12, G = 1500, JUMP = 620, SPRING = 1040, PW = 62, SCROLL = 150;
type Kind = "n" | "m" | "v" | "s" | "b" | "g";
type Plat = { x: number; y: number; vx: number; vy: number; ay: number; kind: Kind; ph: number; broken: boolean };
const COL: Record<Kind, string> = { n: "#10b981", m: "#f59e0b", v: "#8b5cf6", s: "#3b82f6", b: "#b4783c", g: "#22d3ee" };

export function JumpGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const dir = useRef(0);
  const st = useRef({ x: W / 2, y: H - 60, vy: -JUMP, plats: [] as Plat[], scrolled: 0, lastX: W / 2 - PW / 2 });

  function mk(x: number, y: number, kind: Kind): Plat {
    return { x, y, vx: kind === "m" ? (Math.random() < 0.5 ? -1 : 1) * (46 + Math.random() * 40) : 0, vy: kind === "v" ? (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 20) : 0, ay: y, kind, ph: Math.random() * 6.28, broken: false };
  }
  function pick(h: number): Kind {
    const r = Math.random();
    const springP = h > 600 ? 0.10 : 0.05;
    const moveP = Math.min(0.32, 0.10 + h / 7000 * 0.3);
    const vertP = h > 1500 ? Math.min(0.18, (h - 1500) / 9000) : 0;
    const breakP = h > 900 ? Math.min(0.16, (h - 900) / 10000) : 0;
    let a = springP; if (r < a) return "s"; a += moveP; if (r < a) return "m"; a += vertP; if (r < a) return "v"; a += breakP; if (r < a) return "b"; return "n";
  }
  function genAbove(top: number) {
    const s = st.current;
    while (top > -10) {
      const gap = 54 + Math.random() * 38; top -= gap;
      let x = s.lastX + (Math.random() * 2 - 1) * 112; x = Math.max(0, Math.min(W - PW, x)); s.lastX = x;
      s.plats.push(mk(x, top, pick(s.scrolled)));
      if (s.scrolled > 1300 && Math.random() < 0.16) { let gx = x + (Math.random() < 0.5 ? -1 : 1) * (PW + 18 + Math.random() * 40); gx = Math.max(0, Math.min(W - PW, gx)); s.plats.push(mk(gx, top + (Math.random() * 18 - 9), "g")); }
    }
    return top;
  }
  function reset() {
    const s = st.current, baseX = W / 2 - PW / 2;
    s.x = W / 2; s.y = H - 60; s.vy = -JUMP; s.scrolled = 0; s.lastX = baseX;
    s.plats = [{ x: baseX, y: H - 28, vx: 0, vy: 0, ay: H - 28, kind: "n", ph: 0, broken: false }];
    for (const [y, dx] of [[H - 96, 20], [H - 168, -30], [H - 240, 42]]) { const cx = Math.max(0, Math.min(W - PW, baseX + dx)); s.plats.push(mk(cx, y, "n")); s.lastX = cx; }
    genAbove(H - 240); setScore(0); setOver(false);
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H); const s = st.current;
    drawBg(ctx, s);
    for (const p of s.plats) drawPlat(ctx, p);
    drawBall(ctx, s);
    ctx.font = "700 18px system-ui"; ctx.lineWidth = 3; ctx.strokeStyle = "rgba(15,20,45,0.55)"; ctx.strokeText(`${score}`, 12, 28); ctx.fillStyle = "#fff"; ctx.fillText(`${score}`, 12, 28);
    if (!playing && !over) { ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.font = "13px system-ui"; ctx.textAlign = "center"; ctx.fillText("点击开始 · 左右两侧或方向键控制", W / 2, 58); ctx.textAlign = "left"; }
  }
  function drawBg(ctx: CanvasRenderingContext2D, s: typeof st.current) {
    const u = Math.min(1, s.scrolled / 6000), L = (a: number, b: number) => Math.round(a + (b - a) * u);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `rgb(${L(126, 6)},${L(196, 8)},${L(255, 30)})`); sky.addColorStop(1, `rgb(${L(206, 26)},${L(232, 24)},${L(255, 60)})`);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const nStars = Math.floor(10 + u * 60);
    for (let k = 0; k < nStars; k++) { const sx = (k * 71 + 20) % W, sy = (k * 137 + s.scrolled * 0.35) % (H + 40); const tw = 0.35 + 0.65 * Math.abs(Math.sin(k * 1.3 + s.scrolled * 0.01)); ctx.fillStyle = `rgba(255,255,255,${(0.2 + u * 0.6) * tw})`; ctx.beginPath(); ctx.arc(sx, sy, k % 5 === 0 ? 1.6 : 1, 0, Math.PI * 2); ctx.fill(); }
    if (u < 0.62) { const my = 54 + s.scrolled * 0.08; if (my < H) { ctx.save(); ctx.globalAlpha = 1 - u / 0.62; const gl = ctx.createRadialGradient(W - 62, my, 4, W - 62, my, 60); gl.addColorStop(0, "rgba(255,250,225,0.5)"); gl.addColorStop(1, "rgba(255,250,225,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(W - 62, my, 60, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fdf3d0"; ctx.beginPath(); ctx.arc(W - 62, my, 20, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(214,198,150,0.5)"; ctx.beginPath(); ctx.arc(W - 56, my - 5, 4, 0, Math.PI * 2); ctx.arc(W - 70, my + 5, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } }
    if (u < 0.7) { const span = H + 160; for (let k = 0; k < 5; k++) { let cy = ((k * 181 + 70) + s.scrolled * 0.5) % span; if (cy < 0) cy += span; cy -= 80; const cx = (k * 127 + 20) % W; puff(ctx, cx, cy, 0.7 + (k % 3) * 0.2, 0.8 * (1 - u / 0.7)); } }
    if (u > 0.55) { const a = (u - 0.55) / 0.45; let py = (90 + s.scrolled * 0.06) % (H + 220); if (py < 0) py += H + 220; py -= 60; const px = W * 0.26; ctx.save(); ctx.globalAlpha = Math.min(0.85, a); const pg = ctx.createRadialGradient(px - 8, py - 8, 4, px, py, 28); pg.addColorStop(0, "#c9a2ff"); pg.addColorStop(1, "#6d3fb0"); ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 24, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(220,200,255,0.7)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(px, py, 38, 11, -0.4, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
  }
  function drawPlat(ctx: CanvasRenderingContext2D, p: Plat) {
    const col = COL[p.kind];
    let a = 1;
    if (p.kind === "g") a = 0.32 + 0.55 * (0.5 + 0.5 * Math.sin(p.ph));
    if (p.broken) a *= 0.55;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = col; roundRectFill(ctx, p.x, p.y, PW, 12, 5);
    ctx.fillStyle = "rgba(255,255,255,0.34)"; ctx.fillRect(p.x + 4, p.y + 2, PW - 8, 2);
    ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(p.x + 4, p.y + 9, PW - 8, 2);
    if (p.kind === "s") { const sx = p.x + PW / 2; ctx.strokeStyle = "#1e40af"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(sx - 6, p.y - 1); for (let i = 0; i < 3; i++) { ctx.lineTo(sx + 6, p.y - 4 - i * 4); ctx.lineTo(sx - 6, p.y - 7 - i * 4); } ctx.stroke(); ctx.fillStyle = "#1e40af"; ctx.fillRect(sx - 8, p.y - 20, 16, 3); }
    else if (p.kind === "m") { ctx.fillStyle = "rgba(255,255,255,0.6)"; tri(ctx, p.x + 8, p.y + 6, -6); tri(ctx, p.x + PW - 8, p.y + 6, 6); }
    else if (p.kind === "v") { ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.beginPath(); ctx.moveTo(p.x + PW / 2, p.y - 3); ctx.lineTo(p.x + PW / 2 - 5, p.y + 3); ctx.lineTo(p.x + PW / 2 + 5, p.y + 3); ctx.closePath(); ctx.moveTo(p.x + PW / 2, p.y + 15); ctx.lineTo(p.x + PW / 2 - 5, p.y + 9); ctx.lineTo(p.x + PW / 2 + 5, p.y + 9); ctx.closePath(); ctx.fill(); }
    else if (p.kind === "b") { ctx.strokeStyle = "rgba(70,40,15,0.75)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.x + PW * 0.4, p.y); ctx.lineTo(p.x + PW * 0.5, p.y + 12); ctx.moveTo(p.x + PW * 0.72, p.y); ctx.lineTo(p.x + PW * 0.62, p.y + 12); ctx.stroke(); }
    else if (p.kind === "g") { ctx.strokeStyle = "rgba(255,255,255,0.65)"; ctx.lineWidth = 1.3; ctx.strokeRect(p.x + 2, p.y + 2, PW - 4, 8); }
    ctx.restore();
  }
  function drawBall(ctx: CanvasRenderingContext2D, s: typeof st.current) {
    const gl = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, R + 8); gl.addColorStop(0, "rgba(167,139,250,0.5)"); gl.addColorStop(1, "rgba(167,139,250,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(s.x, s.y, R + 8, 0, Math.PI * 2); ctx.fill();
    const bg = ctx.createRadialGradient(s.x - 4, s.y - 5, 2, s.x, s.y, R); bg.addColorStop(0, "#c4b5fd"); bg.addColorStop(1, "#7c5cf6"); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, Math.PI * 2); ctx.fill();
    const dx = dir.current * 2;
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x - 4 + dx, s.y - 3, 3, 0, Math.PI * 2); ctx.arc(s.x + 4 + dx, s.y - 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1f2740"; ctx.beginPath(); ctx.arc(s.x - 4 + dx, s.y - 3, 1.4, 0, Math.PI * 2); ctx.arc(s.x + 4 + dx, s.y - 3, 1.4, 0, Math.PI * 2); ctx.fill();
  }
  useRafLoop((dt) => {
    const s = st.current, f = Math.min(dt / 1000, 0.033);
    s.x += dir.current * 250 * f; if (s.x < 0) s.x += W; if (s.x > W) s.x -= W;
    const prevBottom = s.y + R; s.vy += G * f; s.y += s.vy * f;
    for (const p of s.plats) {
      p.ph += (dt / 1000) * (p.kind === "g" ? 3.2 : 1.4);
      if (p.vx) { p.x += p.vx * f; if (p.x < 0) { p.x = 0; p.vx *= -1; } if (p.x > W - PW) { p.x = W - PW; p.vx *= -1; } }
      if (p.vy) { p.y += p.vy * f; if (p.y < p.ay - 14) { p.y = p.ay - 14; p.vy *= -1; } else if (p.y > p.ay + 14) { p.y = p.ay + 14; p.vy *= -1; } }
      if (p.broken) { p.y += 240 * f; continue; }
      const solid = p.kind !== "g" || (0.32 + 0.55 * (0.5 + 0.5 * Math.sin(p.ph))) > 0.6;
      if (solid && s.vy > 0 && prevBottom <= p.y && s.y + R >= p.y && s.x > p.x - R && s.x < p.x + PW + R) { s.vy = -(p.kind === "s" ? SPRING : JUMP); if (p.kind === "b") p.broken = true; }
    }
    if (s.y < SCROLL) { const d = SCROLL - s.y; s.y = SCROLL; s.scrolled += d; for (const p of s.plats) { p.y += d; p.ay += d; } setScore(Math.floor(s.scrolled / 10)); }
    s.plats = s.plats.filter((p) => p.y < H + 30);
    genAbove(Math.min(...s.plats.map((p) => p.y)));
    if (s.y - R > H) { setBest((b) => Math.max(b, Math.floor(s.scrolled / 10))); setOver(true); setPlaying(false); }
    render();
  }, playing, canvasRef);
  useEffect(() => { render(); });

  function start() { reset(); setPlaying(true); }
  function press(d: number) { if (!playing || over) return start(); dir.current = d; }
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") dir.current = -1; if (e.key === "ArrowRight") dir.current = 1; };
    const up = (e: KeyboardEvent) => { if ((e.key === "ArrowLeft" && dir.current === -1) || (e.key === "ArrowRight" && dir.current === 1)) dir.current = 0; };
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  });

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-[400px]">
        <canvas ref={canvasRef} className="w-full rounded-2xl border border-border" onClick={() => { if (!playing || over) start(); }} />
        {playing && (<>
          <button aria-label="左" className="absolute inset-y-0 left-0 w-1/2" onPointerDown={() => press(-1)} onPointerUp={() => (dir.current = 0)} onPointerLeave={() => (dir.current = 0)} />
          <button aria-label="右" className="absolute inset-y-0 right-0 w-1/2" onPointerDown={() => press(1)} onPointerUp={() => (dir.current = 0)} onPointerLeave={() => (dir.current = 0)} />
        </>)}
        {over && (<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/80"><p className="text-lg font-bold">掉下去了！{score} 分</p><button className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background" onClick={start}>再来一局</button></div>)}
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">高度 <b className="num">{score}</b></div>
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">最高 <b className="num">{best}</b></div>
      </div>
      <p className="text-xs text-muted-foreground">按住屏幕<b>左/右半边</b>（或方向键）控制方向，踩着随机踏板往上跳。<b>6 种踏板</b>：绿普通、橙移动、紫上下动、蓝弹簧（弹更高）、棕易碎（踩一下就碎）、青幻影（忽隐忽现，实心时才能踩）。踏板一定跳得上去；越高普通踏板越少、越难。背景随高度从天空升入太空！</p>
    </div>
  );
}
function tri(ctx: CanvasRenderingContext2D, x: number, y: number, d: number) { ctx.beginPath(); ctx.moveTo(x, y - 3); ctx.lineTo(x + d, y); ctx.lineTo(x, y + 3); ctx.closePath(); ctx.fill(); }
function roundRectFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); } else ctx.fillRect(x, y, w, h); }
function puff(ctx: CanvasRenderingContext2D, x: number, y: number, sc: number, alpha: number) {
  if (alpha <= 0.02) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const lobes = [[-20, 4, 12], [-8, 7, 15], [8, 6, 15], [21, 5, 11], [-3, -6, 14], [11, -3, 12]];
  ctx.fillStyle = "rgba(210,224,255,0.9)"; for (const [dx, dy, r] of lobes) { ctx.beginPath(); ctx.arc(x + dx * sc, y + 3 + dy * sc, r * sc, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#ffffff"; for (const [dx, dy, r] of lobes) { ctx.beginPath(); ctx.arc(x + dx * sc, y + dy * sc, r * sc, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
