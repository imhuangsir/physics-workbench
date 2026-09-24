"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "@/components/demos/canvas";

const W = 480, H = 300, FLOOR = 268, CEIL = 32, PX = 84, PR = 14, G = 1900, MID = (FLOOR + CEIL) / 2;
type Kind = "cactus" | "crate" | "rock" | "saw" | "drone";
type Ob = { x: number; surf: "floor" | "ceil"; kind: Kind; h: number; w: number; ph: number };
const KINDS: { k: Kind; w: number; hmin: number; hmax: number }[] = [
  { k: "cactus", w: 24, hmin: 46, hmax: 74 }, { k: "crate", w: 34, hmin: 34, hmax: 34 },
  { k: "rock", w: 42, hmin: 24, hmax: 30 }, { k: "saw", w: 40, hmin: 40, hmax: 40 }, { k: "drone", w: 32, hmin: 22, hmax: 22 },
];

export function GravityRunGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const st = useRef({ y: FLOOR - PR, vy: 0, dir: 1, obs: [] as Ob[], dist: 0, next: 320, t: 0 });

  function reset() { st.current = { y: FLOOR - PR, vy: 0, dir: 1, obs: [], dist: 0, next: 320, t: 0 }; setScore(0); setOver(false); }

  function rectOf(o: Ob) {
    if (o.kind === "drone") { const y = MID + Math.sin(o.ph) * 46; return { x: o.x, y: y - o.h / 2, w: o.w, h: o.h }; }
    const top = o.surf === "floor" ? FLOOR - o.h : CEIL;
    return { x: o.x, y: top, w: o.w, h: o.h };
  }

  function drawOb(ctx: CanvasRenderingContext2D, o: Ob) {
    const r = rectOf(o), cx = r.x + r.w / 2;
    if (o.kind === "cactus") { ctx.fillStyle = "#3f9d5a"; ctx.fillRect(cx - 6, r.y, 12, r.h); ctx.fillRect(cx - 16, r.y + r.h * 0.4, 10, 6); ctx.fillRect(cx - 16, r.y + r.h * 0.4 - 14, 6, 18); ctx.fillRect(cx + 6, r.y + r.h * 0.3, 10, 6); ctx.fillRect(cx + 10, r.y + r.h * 0.3 - 14, 6, 18); }
    else if (o.kind === "crate") { ctx.fillStyle = "#c8894a"; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.strokeStyle = "#8a5a28"; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h); ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + r.w, r.y + r.h); ctx.moveTo(r.x + r.w, r.y); ctx.lineTo(r.x, r.y + r.h); ctx.stroke(); }
    else if (o.kind === "rock") { ctx.fillStyle = "#8a94a6"; ctx.beginPath(); ctx.ellipse(cx, o.surf === "floor" ? FLOOR : CEIL + r.h, r.w / 2, r.h, 0, o.surf === "floor" ? Math.PI : 0, o.surf === "floor" ? 0 : Math.PI); ctx.fill(); }
    else if (o.kind === "saw") { const yc = o.surf === "floor" ? FLOOR - 16 : CEIL + 16; ctx.save(); ctx.translate(cx, yc); ctx.rotate(o.ph); ctx.fillStyle = "#9aa4bd"; for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(5, -22); ctx.lineTo(-5, -22); ctx.closePath(); ctx.fill(); } ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#5b6480"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    else { const y = MID + Math.sin(o.ph) * 46; ctx.fillStyle = "#e05a6b"; ctx.beginPath(); ctx.ellipse(cx, y, r.w / 2, r.h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(cx - 8, y - 3, 5, 4); ctx.fillRect(cx + 3, y - 3, 5, 4); }
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H); const s = st.current;
    ctx.fillStyle = "#eaf1ff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c1cde0"; ctx.fillRect(0, FLOOR, W, H - FLOOR); ctx.fillRect(0, 0, W, CEIL);
    for (const o of s.obs) drawOb(ctx, o);
    // 机器人
    const bob = Math.sin(s.t * 12) * 1.5;
    ctx.save(); ctx.translate(PX, s.y + bob);
    ctx.fillStyle = C.violet; ctx.fillRect(-13, -12, 26, 24);
    ctx.fillStyle = "#2b3350"; ctx.fillRect(-13, s.dir > 0 ? 8 : -12, 26, 4); // 脚(朝重力方向)
    ctx.fillStyle = "#fff"; ctx.fillRect(-8, -6, 16, 9); ctx.fillStyle = C.blue; ctx.fillRect(s.dir > 0 ? 0 : -6, -5, 6, 7);
    ctx.strokeStyle = C.violet; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, -18); ctx.stroke(); ctx.fillStyle = C.rose; ctx.beginPath(); ctx.arc(0, -19, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = C.ink; ctx.font = "700 16px system-ui"; ctx.fillText(`${Math.floor(s.dist / 10)} m`, W - 74, 26);
    if (!playing && !over) { ctx.fillStyle = C.muted; ctx.font = "14px system-ui"; ctx.fillText("点击开始 · 再点翻转重力躲障碍", W / 2 - 108, MID); }
  }

  useRafLoop((dt) => {
    const s = st.current, f = Math.min(dt / 1000, 0.033); s.t += f;
    const speed = 210 + s.dist * 0.035;
    s.dist += speed * f; setScore(Math.floor(s.dist / 10));
    s.vy += G * s.dir * f; s.y += s.vy * f;
    if (s.y > FLOOR - PR) { s.y = FLOOR - PR; s.vy = 0; } if (s.y < CEIL + PR) { s.y = CEIL + PR; s.vy = 0; }
    for (const o of s.obs) { o.x -= speed * f; o.ph += (o.kind === "saw" ? 8 : 2.4) * f; }
    s.obs = s.obs.filter((o) => o.x + o.w > -6);
    if (s.dist > s.next) { const km = KINDS[Math.floor(Math.random() * KINDS.length)]; s.obs.push({ x: W, surf: Math.random() < 0.5 ? "floor" : "ceil", kind: km.k, w: km.w, h: km.hmin + Math.random() * (km.hmax - km.hmin), ph: 0 }); s.next = s.dist + 210 + Math.random() * 190; }
    for (const o of s.obs) { const r = rectOf(o); if (PX + PR > r.x && PX - PR < r.x + r.w && s.y + PR > r.y && s.y - PR < r.y + r.h) { setBest((b) => Math.max(b, Math.floor(s.dist / 10))); setOver(true); setPlaying(false); } }
    render();
  }, playing, canvasRef);
  useEffect(() => { render(); });

  function tap() { if (over || !playing) { reset(); setPlaying(true); return; } st.current.dir *= -1; }
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === " ") { e.preventDefault(); tap(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });

  return (
    <div className="space-y-3">
      <div className="relative">
        <canvas ref={canvasRef} onClick={tap} className="w-full cursor-pointer rounded-2xl border border-border" />
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/80">
            <p className="text-lg font-bold">撞上了！{score} m</p>
            <button className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background" onClick={tap}>再来一局</button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">距离 <b className="num">{score}</b> m</div>
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">最远 <b className="num">{best}</b> m</div>
      </div>
      <p className="text-xs text-muted-foreground">点击画面（或空格）<b>翻转重力</b>，让小机器人在地面和天花板间穿行，躲开仙人掌、木箱、石头、旋转锯片和飞行障碍。障碍随机、会动、越跑越快，比谁冲得远。</p>
    </div>
  );
}
