"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "@/components/demos/canvas";

const W = 480, H = 300, FLOOR = 268, CEIL = 32, PX = 84, PR = 14, G = 1900, MID = (FLOOR + CEIL) / 2;
type Kind = "cactus" | "crate" | "rock" | "cone" | "hurdle" | "saw" | "drone" | "spikes";
type Ob = { x: number; surf: "floor" | "ceil"; kind: Kind; h: number; w: number; ph: number };
// 按解锁顺序：越往后花样越多
const KINDS: { k: Kind; w: number; hmin: number; hmax: number }[] = [
  { k: "cactus", w: 24, hmin: 46, hmax: 72 }, { k: "crate", w: 34, hmin: 32, hmax: 40 }, { k: "rock", w: 44, hmin: 22, hmax: 30 },
  { k: "cone", w: 30, hmin: 40, hmax: 40 }, { k: "hurdle", w: 30, hmin: 52, hmax: 52 }, { k: "saw", w: 40, hmin: 40, hmax: 40 },
  { k: "drone", w: 32, hmin: 22, hmax: 22 }, { k: "spikes", w: 46, hmin: 22, hmax: 22 },
];

export function GravityRunGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const st = useRef({ y: FLOOR - PR, vy: 0, dir: 1, obs: [] as Ob[], dist: 0, next: 340, t: 0, run: 0 });

  function reset() { st.current = { y: FLOOR - PR, vy: 0, dir: 1, obs: [], dist: 0, next: 340, t: 0, run: 0 }; setScore(0); setOver(false); }

  function rectOf(o: Ob) {
    if (o.kind === "drone") { return { x: o.x, y: MID + Math.sin(o.ph) * 46 - o.h / 2, w: o.w, h: o.h }; }
    return { x: o.x, y: o.surf === "floor" ? FLOOR - o.h : CEIL, w: o.w, h: o.h };
  }
  function drawOb(ctx: CanvasRenderingContext2D, o: Ob) {
    const r = rectOf(o), cx = r.x + r.w / 2, floorS = o.surf === "floor";
    if (o.kind === "cactus") { ctx.fillStyle = "#3f9d5a"; rr(ctx, cx - 6, r.y, 12, r.h, 5); ctx.fillRect(cx - 16, r.y + r.h * 0.42, 12, 7); rr(ctx, cx - 18, r.y + r.h * 0.42 - 16, 7, 20, 3); ctx.fillRect(cx + 4, r.y + r.h * 0.3, 12, 7); rr(ctx, cx + 11, r.y + r.h * 0.3 - 16, 7, 20, 3); }
    else if (o.kind === "crate") { const gg = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h); gg.addColorStop(0, "#d99a58"); gg.addColorStop(1, "#b0763a"); ctx.fillStyle = gg; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = "#7c5222"; ctx.lineWidth = 2.5; ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.moveTo(r.x + r.w, r.y); ctx.lineTo(r.x, r.y + r.h); ctx.stroke(); }
    else if (o.kind === "rock") { const gg = ctx.createLinearGradient(cx, r.y, cx, r.y + r.h); gg.addColorStop(0, "#a2acbd"); gg.addColorStop(1, "#6f7a8d"); ctx.fillStyle = gg; ctx.beginPath(); ctx.ellipse(cx, floorS ? FLOOR : CEIL, r.w / 2, r.h, 0, floorS ? Math.PI : 0, floorS ? 0 : Math.PI); ctx.fill(); }
    else if (o.kind === "cone") { ctx.fillStyle = "#f2792b"; ctx.beginPath(); ctx.moveTo(cx, r.y); ctx.lineTo(r.x - 2, r.y + r.h); ctx.lineTo(r.x + r.w + 2, r.y + r.h); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(cx - 9, r.y + r.h * 0.42, 18, 5); ctx.fillStyle = "#d95f14"; ctx.fillRect(r.x - 4, r.y + r.h - 4, r.w + 8, 4); }
    else if (o.kind === "hurdle") { ctx.strokeStyle = "#7c8598"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(r.x + 3, r.y); ctx.lineTo(r.x + 3, r.y + r.h); ctx.moveTo(r.x + r.w - 3, r.y); ctx.lineTo(r.x + r.w - 3, r.y + r.h); ctx.stroke(); ctx.fillStyle = "#e9b949"; ctx.fillRect(r.x, r.y + (floorS ? 0 : r.h - 10), r.w, 10); ctx.fillStyle = "#c99a2a"; for (let i = 0; i < 3; i++) ctx.fillRect(r.x + 4 + i * 10, r.y + (floorS ? 0 : r.h - 10), 4, 10); }
    else if (o.kind === "saw") { const yc = floorS ? FLOOR - 16 : CEIL + 16; ctx.save(); ctx.translate(cx, yc); ctx.rotate(o.ph); ctx.fillStyle = "#9aa4bd"; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(5, -22); ctx.lineTo(-5, -22); ctx.closePath(); ctx.fill(); } ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#5b6480"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    else if (o.kind === "drone") { const y = MID + Math.sin(o.ph) * 46; ctx.fillStyle = "#e05a6b"; rr(ctx, cx - r.w / 2, y - r.h / 2, r.w, r.h, 6); ctx.fillStyle = "#fff"; ctx.fillRect(cx - 9, y - 3, 5, 4); ctx.fillRect(cx + 4, y - 3, 5, 4); ctx.strokeStyle = "#e05a6b"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - r.w / 2, y - r.h / 2); ctx.lineTo(cx - r.w / 2 - 6, y - r.h / 2 - 6); ctx.moveTo(cx + r.w / 2, y - r.h / 2); ctx.lineTo(cx + r.w / 2 + 6, y - r.h / 2 - 6); ctx.stroke(); }
    else { ctx.fillStyle = "#8a94a6"; for (let i = 0; i < 4; i++) { const bx = r.x + i * (r.w / 4); ctx.beginPath(); if (floorS) { ctx.moveTo(bx, FLOOR); ctx.lineTo(bx + r.w / 8, FLOOR - r.h); ctx.lineTo(bx + r.w / 4, FLOOR); } else { ctx.moveTo(bx, CEIL); ctx.lineTo(bx + r.w / 8, CEIL + r.h); ctx.lineTo(bx + r.w / 4, CEIL); } ctx.closePath(); ctx.fill(); } }
  }

  function drawRobot(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, run: number) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, dir); // dir=-1 时上下翻(在天花板上)
    // 腿（跑动）
    ctx.strokeStyle = "#3a4668"; ctx.lineWidth = 4; ctx.lineCap = "round";
    [0, Math.PI].forEach((o) => { const a = Math.sin(run + o) * 0.6; ctx.beginPath(); ctx.moveTo(0, 8); ctx.lineTo(Math.sin(a) * 9, 20); ctx.stroke(); });
    // 身体
    const bg = ctx.createLinearGradient(0, -14, 0, 8); bg.addColorStop(0, "#a78bfa"); bg.addColorStop(1, "#7c5cf6");
    ctx.fillStyle = bg; rr(ctx, -13, -14, 26, 24, 6);
    ctx.fillStyle = "#e9e2ff"; rr(ctx, -9, -8, 18, 11, 3); ctx.fillStyle = C.blue; ctx.fillRect(2, -6, 6, 7); // 眼
    ctx.strokeStyle = "#7c5cf6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -20); ctx.stroke(); ctx.fillStyle = C.rose; ctx.beginPath(); ctx.arc(0, -21, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H); const s = st.current;
    // 天空 + 视差远山 + 云
    const sky = ctx.createLinearGradient(0, CEIL, 0, FLOOR); sky.addColorStop(0, "#bfe6ff"); sky.addColorStop(1, "#eaf5ff");
    ctx.fillStyle = sky; ctx.fillRect(0, CEIL, W, FLOOR - CEIL);
    for (let k = 0; k < 4; k++) { const cx = ((k * 160 - s.dist * 0.25) % (W + 120) + W + 120) % (W + 120) - 60, cy = 70 + (k % 2) * 30; ctx.fillStyle = "rgba(255,255,255,0.8)"; [[0, 0, 14], [15, 4, 11], [-14, 5, 10]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill(); }); }
    ctx.fillStyle = "#bcd8b4"; ctx.beginPath(); ctx.moveTo(0, FLOOR); for (let x = 0; x <= W; x += 6) ctx.lineTo(x, FLOOR - 26 - Math.sin((x + s.dist * 0.35) / 70) * 22 * (0.5 + Math.abs(Math.sin((x + s.dist * 0.35) / 140)))); ctx.lineTo(W, FLOOR); ctx.closePath(); ctx.fill();
    // 地面/天花板
    ctx.fillStyle = "#b3a07f"; ctx.fillRect(0, FLOOR, W, H - FLOOR); ctx.fillStyle = "#9c8a6a"; ctx.fillRect(0, 0, W, CEIL);
    ctx.strokeStyle = "rgba(90,70,40,0.35)"; ctx.lineWidth = 2; for (let x = -(s.dist % 40); x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, FLOOR + 6); ctx.lineTo(x + 14, FLOOR + 6); ctx.stroke(); }
    for (const o of s.obs) drawOb(ctx, o);
    drawRobot(ctx, PX, s.y, s.dir, s.run);
    ctx.fillStyle = C.ink; ctx.font = "700 16px system-ui"; ctx.fillText(`${Math.floor(s.dist / 10)} m`, W - 74, 24);
    if (!playing && !over) { ctx.fillStyle = "#3a4668"; ctx.font = "14px system-ui"; ctx.fillText("点击开始 · 再点翻转重力躲障碍", W / 2 - 108, MID); }
  }

  useRafLoop((dt) => {
    const s = st.current, f = Math.min(dt / 1000, 0.033); s.t += f;
    const speed = 210 + s.dist * 0.035; s.run += speed * f * 0.045;
    s.dist += speed * f; setScore(Math.floor(s.dist / 10));
    s.vy += G * s.dir * f; s.y += s.vy * f;
    if (s.y > FLOOR - PR) { s.y = FLOOR - PR; s.vy = 0; } if (s.y < CEIL + PR) { s.y = CEIL + PR; s.vy = 0; }
    for (const o of s.obs) { o.x -= speed * f; o.ph += (o.kind === "saw" ? 8 : 2.4) * f; }
    s.obs = s.obs.filter((o) => o.x + o.w > -6);
    if (s.dist > s.next) { const nk = Math.min(KINDS.length, 3 + Math.floor(s.dist / 500)); const km = KINDS[Math.floor(Math.random() * nk)]; s.obs.push({ x: W, surf: Math.random() < 0.5 ? "floor" : "ceil", kind: km.k, w: km.w, h: km.hmin + Math.random() * (km.hmax - km.hmin), ph: 0 }); s.next = s.dist + Math.max(150, 230 - s.dist / 60) + Math.random() * 150; }
    for (const o of s.obs) { const r = rectOf(o); if (PX + PR - 3 > r.x && PX - PR + 3 < r.x + r.w && s.y + PR - 3 > r.y && s.y - PR + 3 < r.y + r.h) { setBest((b) => Math.max(b, Math.floor(s.dist / 10))); setOver(true); setPlaying(false); } }
    render();
  }, playing, canvasRef);
  useEffect(() => { render(); });

  function tap() { if (over || !playing) { reset(); setPlaying(true); return; } st.current.dir *= -1; }
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === " ") { e.preventDefault(); tap(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });

  return (
    <div className="space-y-3">
      <div className="relative">
        <canvas ref={canvasRef} onClick={tap} className="w-full cursor-pointer rounded-2xl border border-border" />
        {over && (<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/80"><p className="text-lg font-bold">撞上了！{score} m</p><button className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background" onClick={tap}>再来一局</button></div>)}
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">距离 <b className="num">{score}</b> m</div>
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">最远 <b className="num">{best}</b> m</div>
      </div>
      <p className="text-xs text-muted-foreground">点击画面（或空格）<b>翻转重力</b>，小机器人在地面和天花板间奔跑，躲开各种障碍。跑得越远：先加速、再解锁更多花样障碍（仙人掌/木箱/石头/路障/栏杆/锯片/飞行器/尖刺），交替变难。</p>
    </div>
  );
}
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
}
