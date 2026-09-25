"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "@/components/demos/canvas";

const W = 340, H = 400, R = 12, G = 1500, JUMP = 620, SPRING = 1000, PW = 64, SCROLL = 150;
type Plat = { x: number; y: number; vx: number; type: "n" | "m" | "s" };

export function JumpGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const dir = useRef(0);
  const st = useRef({ x: W / 2, y: H - 60, vy: -JUMP, plats: [] as Plat[], scrolled: 0, lastX: W / 2 - PW / 2 });

  function genAbove(top: number) {
    const s = st.current;
    while (top > -10) {
      const gap = 58 + Math.random() * 40; // ≤ ~98 < 跳跃高度，保证够得着
      top -= gap;
      let x = s.lastX + (Math.random() * 2 - 1) * 118; // 与上一块横向不超过一跳能移动的距离
      x = Math.max(0, Math.min(W - PW, x)); s.lastX = x;
      const r = Math.random();
      const type: Plat["type"] = s.scrolled > 800 && r < 0.16 ? "s" : s.scrolled > 1500 && r < 0.44 ? "m" : "n";
      s.plats.push({ x, y: top, vx: type === "m" ? (Math.random() < 0.5 ? -1 : 1) * (45 + Math.random() * 40) : 0, type });
    }
    return top;
  }
  function reset() {
    const base: Plat = { x: W / 2 - PW / 2, y: H - 30, vx: 0, type: "n" };
    st.current = { x: W / 2, y: H - 60, vy: -JUMP, plats: [base], scrolled: 0, lastX: base.x };
    let top = H - 90; while (top > -10) { top -= 74; st.current.plats.push({ x: Math.max(0, Math.min(W - PW, st.current.lastX + (Math.random() * 2 - 1) * 110)), y: top, vx: 0, type: "n" }); st.current.lastX = st.current.plats[st.current.plats.length - 1].x; }
    setScore(0); setOver(false);
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H); const s = st.current;
    const u = Math.min(1, s.scrolled / 6000), L = (a: number, b: number) => Math.round(a + (b - a) * u);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `rgb(${L(140, 8)},${L(200, 12)},${L(255, 36)})`); sky.addColorStop(1, `rgb(${L(215, 20)},${L(240, 28)},${L(230, 74)})`);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // 星星(高空) / 云(低空)，随高度视差
    if (u > 0.25) for (let k = 0; k < 30; k++) { const sx = (k * 71) % W, sy = ((k * 137 + s.scrolled * 0.3) % (H + 40)); ctx.fillStyle = `rgba(255,255,255,${(u - 0.25) * (0.4 + (k % 3) * 0.2)})`; ctx.beginPath(); ctx.arc(sx, sy, 1.3, 0, Math.PI * 2); ctx.fill(); }
    if (u < 0.7) for (let k = 0; k < 4; k++) { const cx = (k * 110 + 40) % W, cy = ((k * 190 + s.scrolled * 0.5) % (H + 80)) - 40; ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - u / 0.7)})`; [[0, 0, 13], [13, 4, 10], [-12, 4, 9]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, r, 0, Math.PI * 2); ctx.fill(); }); }
    // 踏板
    for (const p of s.plats) {
      const col = p.type === "s" ? "#3b82f6" : p.type === "m" ? "#f59e0b" : "#10b981";
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x, p.y, PW, 12, 5) : ctx.rect(p.x, p.y, PW, 12); ctx.fill();
      if (p.type === "s") { ctx.strokeStyle = "#1e40af"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x + PW / 2 - 6, p.y); ctx.lineTo(p.x + PW / 2 - 3, p.y - 7); ctx.lineTo(p.x + PW / 2 + 3, p.y - 3); ctx.lineTo(p.x + PW / 2 + 6, p.y - 9); ctx.stroke(); }
    }
    // 小球(带脸)
    ctx.fillStyle = C.violet; ctx.beginPath(); ctx.arc(s.x, s.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x - 4 + dir.current * 2, s.y - 3, 3, 0, Math.PI * 2); ctx.arc(s.x + 4 + dir.current * 2, s.y - 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1f2740"; ctx.beginPath(); ctx.arc(s.x - 4 + dir.current * 2, s.y - 3, 1.4, 0, Math.PI * 2); ctx.arc(s.x + 4 + dir.current * 2, s.y - 3, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.font = "700 16px system-ui"; ctx.fillText(`${score}`, 12, 26);
    if (!playing && !over) { ctx.fillStyle = "#3a4668"; ctx.font = "13px system-ui"; ctx.fillText("点击开始 · 左右两侧控制方向", W / 2 - 92, 66); }
  }

  useRafLoop((dt) => {
    const s = st.current, f = Math.min(dt / 1000, 0.033);
    s.x += dir.current * 250 * f; if (s.x < 0) s.x += W; if (s.x > W) s.x -= W;
    const prevBottom = s.y + R; s.vy += G * f; s.y += s.vy * f;
    for (const p of s.plats) {
      if (p.vx) { p.x += p.vx * f; if (p.x < 0 || p.x > W - PW) p.vx *= -1; }
      if (s.vy > 0 && prevBottom <= p.y && s.y + R >= p.y && s.x > p.x - R && s.x < p.x + PW + R) s.vy = -(p.type === "s" ? SPRING : JUMP);
    }
    if (s.y < SCROLL) { const d = SCROLL - s.y; s.y = SCROLL; s.scrolled += d; for (const p of s.plats) p.y += d; setScore(Math.floor(s.scrolled / 10)); }
    s.plats = s.plats.filter((p) => p.y < H + 20);
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
      <p className="text-xs text-muted-foreground">按住屏幕<b>左/右半边</b>（或方向键）控制方向，踩着随机生成的踏板往上跳。绿色普通、<b>橙色会移动</b>、<b>蓝色弹簧</b>能弹更高——踏板间距保证跳得上去。越往上背景越高（天空→太空），比谁跳得高！</p>
    </div>
  );
}
