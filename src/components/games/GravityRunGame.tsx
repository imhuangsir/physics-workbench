"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "@/components/demos/canvas";

const W = 560, H = 200, FLOOR = 178, CEIL = 22, BX = 88, R = 11, G = 1500;
type Ob = { x: number; surf: "floor" | "ceil"; w: number; h: number };

export function GravityRunGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const st = useRef({ y: FLOOR - R, vy: 0, dir: 1, obs: [] as Ob[], dist: 0, next: 300 });

  function reset() { st.current = { y: FLOOR - R, vy: 0, dir: 1, obs: [], dist: 0, next: 300 }; setScore(0); setOver(false); }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const s = st.current;
    ctx.fillStyle = "#eef4ff"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c7d2e0"; ctx.fillRect(0, FLOOR, W, H - FLOOR); ctx.fillRect(0, 0, W, CEIL);
    for (const o of s.obs) { ctx.fillStyle = C.rose; ctx.fillRect(o.x, o.surf === "floor" ? FLOOR - o.h : CEIL, o.w, o.h); }
    ctx.fillStyle = C.violet; ctx.beginPath(); ctx.arc(BX, s.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(BX + s.dir * 3, s.y - 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = "700 15px system-ui"; ctx.fillText(`${Math.floor(s.dist / 10)} m`, W - 70, 40);
    if (!playing && !over) { ctx.fillStyle = C.muted; ctx.font = "14px system-ui"; ctx.fillText("点击开始 · 再点一下翻转重力", W / 2 - 96, H / 2); }
  }

  useRafLoop((dt) => {
    const s = st.current, f = Math.min(dt / 1000, 0.033);
    const speed = 190 + s.dist * 0.03;
    s.dist += speed * f; setScore(Math.floor(s.dist / 10));
    s.vy += G * s.dir * f; s.y += s.vy * f;
    if (s.y > FLOOR - R) { s.y = FLOOR - R; s.vy = 0; }
    if (s.y < CEIL + R) { s.y = CEIL + R; s.vy = 0; }
    for (const o of s.obs) o.x -= speed * f;
    s.obs = s.obs.filter((o) => o.x + o.w > -4);
    if (s.dist > s.next) { s.obs.push({ x: W, surf: Math.random() < 0.5 ? "floor" : "ceil", w: 20 + Math.random() * 18, h: 26 + Math.random() * 40 }); s.next = s.dist + 190 + Math.random() * 170; }
    for (const o of s.obs) {
      const oy = o.surf === "floor" ? FLOOR - o.h : CEIL, ob = o.surf === "floor" ? FLOOR : CEIL + o.h;
      if (BX + R > o.x && BX - R < o.x + o.w && s.y + R > oy && s.y - R < ob) { setBest((b) => Math.max(b, Math.floor(s.dist / 10))); setOver(true); setPlaying(false); }
    }
    render();
  }, playing, canvasRef);
  useEffect(() => { render(); });

  function tap() {
    if (over) { reset(); setPlaying(true); return; }
    if (!playing) { reset(); setPlaying(true); return; }
    st.current.dir *= -1;
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === " ") { e.preventDefault(); tap(); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

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
      <p className="text-xs text-muted-foreground">点击画面（或按空格）<b>翻转重力</b>，让小球在地面和天花板之间穿行，躲开红色障碍。障碍随机出现、越跑越快，比谁冲得远。</p>
    </div>
  );
}
