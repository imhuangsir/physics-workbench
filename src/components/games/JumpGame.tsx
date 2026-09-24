"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "@/components/demos/canvas";

const W = 340, H = 380, R = 12, G = 1500, JUMP = 640, PW = 62, SCROLL = 150;
type Plat = { x: number; y: number; vx: number };

export function JumpGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const dir = useRef(0);
  const st = useRef({ x: W / 2, y: H - 60, vy: -JUMP, plats: [] as Plat[], scrolled: 0 });

  function reset() {
    const plats: Plat[] = [{ x: W / 2 - PW / 2, y: H - 30, vx: 0 }];
    for (let y = H - 100; y > -20; y -= 70) plats.push({ x: Math.random() * (W - PW), y, vx: 0 });
    st.current = { x: W / 2, y: H - 60, vy: -JUMP, plats, scrolled: 0 };
    setScore(0); setOver(false);
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const s = st.current;
    ctx.fillStyle = "#eef4ff"; ctx.fillRect(0, 0, W, H);
    for (const p of s.plats) { ctx.fillStyle = p.vx ? C.amber : C.emerald; ctx.fillRect(p.x, p.y, PW, 10); }
    ctx.fillStyle = C.violet; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x + dir.current * 3, s.y - 3, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = "700 16px system-ui"; ctx.fillText(`${score}`, 12, 26);
    if (!playing && !over) { ctx.fillStyle = C.muted; ctx.font = "13px system-ui"; ctx.fillText("点击开始 · 左右两侧控制方向", W / 2 - 92, 60); }
  }

  useRafLoop((dt) => {
    const s = st.current, f = Math.min(dt / 1000, 0.033);
    s.x += dir.current * 240 * f;
    if (s.x < 0) s.x += W; if (s.x > W) s.x -= W;
    const prevBottom = s.y + R;
    s.vy += G * f; s.y += s.vy * f;
    for (const p of s.plats) {
      if (p.vx) { p.x += p.vx * f; if (p.x < 0 || p.x > W - PW) p.vx *= -1; }
      if (s.vy > 0 && prevBottom <= p.y && s.y + R >= p.y && s.x > p.x - R && s.x < p.x + PW + R) { s.y = p.y - R; s.vy = -JUMP; }
    }
    if (s.y < SCROLL) { const d = SCROLL - s.y; s.y = SCROLL; s.scrolled += d; for (const p of s.plats) p.y += d; setScore(Math.floor(s.scrolled / 10)); }
    s.plats = s.plats.filter((p) => p.y < H + 20);
    let top = Math.min(...s.plats.map((p) => p.y));
    while (top > 0) {
      const gap = 55 + Math.random() * 45 + Math.min(35, s.scrolled / 3000 * 35);
      top -= gap;
      const moving = s.scrolled > 2500 && Math.random() < 0.4;
      s.plats.push({ x: Math.random() * (W - PW), y: top, vx: moving ? (Math.random() < 0.5 ? -1 : 1) * (45 + Math.random() * 45) : 0 });
    }
    if (s.y - R > H) { setBest((b) => Math.max(b, Math.floor(s.scrolled / 10))); setOver(true); setPlaying(false); }
    render();
  }, playing, canvasRef);
  useEffect(() => { render(); });

  function start() { reset(); setPlaying(true); }
  function press(d: number) { if (!playing && !over) return start(); if (over) return start(); dir.current = d; }
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") dir.current = -1; if (e.key === "ArrowRight") dir.current = 1; };
    const up = (e: KeyboardEvent) => { if ((e.key === "ArrowLeft" && dir.current === -1) || (e.key === "ArrowRight" && dir.current === 1)) dir.current = 0; };
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  });

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-[380px]">
        <canvas ref={canvasRef} className="w-full rounded-2xl border border-border" onClick={() => { if (!playing || over) start(); }} />
        {playing && (
          <>
            <button aria-label="左" className="absolute inset-y-0 left-0 w-1/2" onPointerDown={() => press(-1)} onPointerUp={() => (dir.current = 0)} onPointerLeave={() => (dir.current = 0)} />
            <button aria-label="右" className="absolute inset-y-0 right-0 w-1/2" onPointerDown={() => press(1)} onPointerUp={() => (dir.current = 0)} onPointerLeave={() => (dir.current = 0)} />
          </>
        )}
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/80">
            <p className="text-lg font-bold">掉下去了！{score} 分</p>
            <button className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background" onClick={start}>再来一局</button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">高度 <b className="num">{score}</b></div>
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">最高 <b className="num">{best}</b></div>
      </div>
      <p className="text-xs text-muted-foreground">小球自动往上弹，按住屏幕<b>左/右半边</b>（或方向键）控制左右，踩着<b>随机生成</b>的踏板一路往上跳。越高踏板越稀、还会移动，掉下去就结束。比谁跳得高！</p>
    </div>
  );
}
