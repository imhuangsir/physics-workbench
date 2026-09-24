"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop, C } from "@/components/demos/canvas";

const W = 340, H = 320, BH = 24, BOTTOM = H - 16;
type Blk = { x: number; w: number };

export function StackGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const st = useRef({ stack: [] as Blk[], mv: { x: 40, w: 90, dir: 1 } });

  function reset() {
    st.current = { stack: [{ x: W / 2 - 45, w: 90 }], mv: { x: 20, w: 60 + Math.random() * 30, dir: 1 } };
    setScore(0); setOver(false);
  }

  function cam(len: number) { return Math.max(0, (len + 2) * BH - (H - 40)); }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const s = st.current, co = cam(s.stack.length);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    const tones = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e"];
    s.stack.forEach((b, i) => { ctx.fillStyle = tones[i % tones.length]; ctx.fillRect(b.x, BOTTOM - (i + 1) * BH + co, b.w, BH - 3); });
    if (playing) { const b = s.mv; ctx.fillStyle = "#1f2740"; ctx.fillRect(b.x, BOTTOM - (s.stack.length + 1) * BH + co, b.w, BH - 3); }
    ctx.fillStyle = C.ink; ctx.font = "700 16px system-ui"; ctx.fillText(`${score}`, 14, 28);
    if (!playing && !over) { ctx.fillStyle = C.muted; ctx.font = "14px system-ui"; ctx.fillText("点击开始，再点一下落下方块", W / 2 - 96, 60); }
  }

  useRafLoop((dt) => {
    const s = st.current, f = Math.min(dt / 1000, 0.033), b = s.mv;
    const speed = 95 + s.stack.length * 7;
    b.x += b.dir * speed * f;
    if (b.x < 0) { b.x = 0; b.dir = 1; } if (b.x + b.w > W) { b.x = W - b.w; b.dir = -1; }
    render();
  }, playing, canvasRef);
  useEffect(() => { render(); });

  function drop() {
    const s = st.current;
    if (over) { reset(); setPlaying(true); return; }
    if (!playing) { reset(); setPlaying(true); return; }
    const top = s.stack[s.stack.length - 1], b = s.mv;
    const ov = Math.min(b.x + b.w, top.x + top.w) - Math.max(b.x, top.x);
    if (ov <= 2) { finish(); return; } // 完全没搭上
    s.stack.push({ x: b.x, w: b.w });
    // 重心是否越出底座
    const base = s.stack[0]; let m = 0, mx = 0;
    for (const bb of s.stack) { m += bb.w; mx += (bb.x + bb.w / 2) * bb.w; }
    const com = mx / m;
    if (com < base.x || com > base.x + base.w) { finish(); return; }
    setScore(s.stack.length - 1);
    s.mv = { x: 0, w: Math.max(34, top.w - Math.random() * 6), dir: 1 };
  }
  function finish() { setBest((x) => Math.max(x, st.current.stack.length - 1)); setOver(true); setPlaying(false); }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === " ") { e.preventDefault(); drop(); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-[380px]">
        <canvas ref={canvasRef} onClick={drop} className="w-full cursor-pointer rounded-2xl border border-border" />
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/80">
            <p className="text-lg font-bold">倒了！叠了 {score} 层</p>
            <button className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background" onClick={drop}>再来一局</button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">层数 <b className="num">{score}</b></div>
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">最高 <b className="num">{best}</b></div>
      </div>
      <p className="text-xs text-muted-foreground">点击（或空格）让移动的方块落下，尽量对齐往上叠。方块<b>宽窄随机</b>、越叠越快；只要整体<b>重心偏出底座</b>或没搭上，塔就倒了。看能叠多高！</p>
    </div>
  );
}
