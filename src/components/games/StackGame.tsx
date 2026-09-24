"use client";
import { useEffect, useRef, useState } from "react";
import type { Body, Engine } from "matter-js";
import { fitCanvas, C } from "@/components/demos/canvas";

const W = 360, H = 440, BH = 26, GROUND = 400, DROP_GAP = 130;
const TONES = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4"];
type Blk = { body: Body; w: number; col: string };

export function StackGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [ready, setReady] = useState(false);
  const g = useRef<{
    M: typeof import("matter-js"); engine: Engine; blocks: Blk[];
    carrier: { x: number; w: number; dir: number; y: number };
    phase: "aim" | "fall"; prevTop: number; camY: number; settle: number; dropped: Blk | null; over: boolean;
  } | null>(null);

  useEffect(() => {
    let raf = 0, mounted = true;
    import("matter-js").then((M) => {
      if (!mounted) return;
      const engine = M.Engine.create(); engine.gravity.y = 1.2;
      const ground = M.Bodies.rectangle(W / 2, GROUND + 40, W * 3, 80, { isStatic: true });
      M.Composite.add(engine.world, ground);
      g.current = { M, engine, blocks: [], carrier: { x: W / 2, w: 84, dir: 1, y: GROUND - 40 }, phase: "aim", prevTop: GROUND, camY: 0, settle: 0, dropped: null, over: false };
      addBase(); newCarrier(); setReady(true);
      const loop = () => { step(); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    });
    return () => { mounted = false; cancelAnimationFrame(raf); const s = g.current; if (s) { s.M.Composite.clear(s.engine.world, false); s.M.Engine.clear(s.engine); } };
  }, []);

  function addBase() { const s = g.current!; const w = 96, b = s.M.Bodies.rectangle(W / 2, GROUND - BH / 2, w, BH, { friction: 0.9, isStatic: false }); s.M.Composite.add(s.engine.world, b); s.blocks.push({ body: b, w, col: TONES[0] }); s.prevTop = GROUND - BH; }
  function newCarrier() { const s = g.current!; const w = 46 + Math.random() * 46; s.carrier = { x: W / 2, w, dir: Math.random() < 0.5 ? 1 : -1, y: s.prevTop - DROP_GAP }; s.phase = "aim"; }
  function drop() {
    const s = g.current; if (!s || s.over) return;
    if (s.phase !== "aim") return;
    const b = s.M.Bodies.rectangle(s.carrier.x, s.carrier.y, s.carrier.w, BH, { friction: 0.9, restitution: 0 });
    s.M.Composite.add(s.engine.world, b);
    const blk = { body: b, w: s.carrier.w, col: TONES[s.blocks.length % TONES.length] };
    s.blocks.push(blk); s.dropped = blk; s.phase = "fall"; s.settle = 0;
  }

  function step() {
    const s = g.current; if (!s) return;
    s.M.Engine.update(s.engine, 1000 / 60);
    if (!s.over) {
      if (s.phase === "aim") { const c = s.carrier; c.x += c.dir * (2.2 + s.blocks.length * 0.15); if (c.x < c.w / 2) { c.x = c.w / 2; c.dir = 1; } if (c.x > W - c.w / 2) { c.x = W - c.w / 2; c.dir = -1; } }
      else if (s.phase === "fall" && s.dropped) {
        const d = s.dropped.body, sp = Math.hypot(d.velocity.x, d.velocity.y);
        if (sp < 0.45 && Math.abs(d.angularVelocity) < 0.03) s.settle++; else s.settle = 0;
        if (s.settle > 14) judge();
      }
      if (s.blocks.some((b) => b.body.position.y > GROUND + 220 || b.body.position.x < -80 || b.body.position.x > W + 80)) end();
    }
    render();
  }
  function judge() {
    const s = g.current!; const d = s.dropped!;
    const rose = d.body.bounds.min.y < s.prevTop - BH * 0.4;
    if (!rose || Math.abs(d.body.angle) > 0.6) { end(); return; }
    s.prevTop = Math.min(...s.blocks.map((b) => b.body.bounds.min.y));
    setScore(s.blocks.length - 1); newCarrier();
  }
  function end() { const s = g.current!; if (s.over) return; s.over = true; setBest((x) => Math.max(x, s.blocks.length - 1)); setOver(true); }

  function render() {
    const cv = canvasRef.current, s = g.current; if (!cv || !s) return;
    const ctx = fitCanvas(cv, W, H);
    const camTarget = Math.min(s.carrier.y, s.prevTop) - 70; s.camY += (camTarget - s.camY) * 0.1;
    const cam = Math.min(0, s.camY);
    ctx.fillStyle = "#f2f6fc"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#d7e0ee"; ctx.fillRect(0, GROUND - cam, W, H); // 地面
    for (const b of s.blocks) drawBlk(ctx, b, cam);
    if (s.phase === "aim" && !s.over) { // 待落方块在顶部
      const c = s.carrier, y = c.y - cam;
      ctx.globalAlpha = 0.92; drawRect(ctx, c.x, y, c.w, BH, 0, "#3a4668", "#1f2740"); ctx.globalAlpha = 1;
      ctx.strokeStyle = "#5b6480"; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(c.x, y + BH / 2); ctx.lineTo(c.x, y + 40); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = C.ink; ctx.font = "700 18px system-ui"; ctx.fillText(`${score}`, 14, 30);
  }
  function drawBlk(ctx: CanvasRenderingContext2D, b: Blk, cam: number) { drawRect(ctx, b.body.position.x, b.body.position.y - cam, b.w, BH, b.body.angle, shade(b.col, 1.18), b.col); }
  function drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ang: number, top: string, bot: string) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.shadowColor = "rgba(30,40,70,0.18)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2); grad.addColorStop(0, top); grad.addColorStop(1, bot);
    ctx.fillStyle = grad; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = shade(bot, 0.8); ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.35)"; ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 3);
    ctx.restore();
  }

  function tap() { const s = g.current; if (!s) return; if (s.over) { restart(); return; } drop(); }
  function restart() {
    const s = g.current; if (!s) return;
    s.M.Composite.clear(s.engine.world, false);
    s.M.Composite.add(s.engine.world, s.M.Bodies.rectangle(W / 2, GROUND + 40, W * 3, 80, { isStatic: true }));
    s.blocks = []; s.over = false; s.camY = 0; s.prevTop = GROUND; addBase(); newCarrier(); setScore(0); setOver(false);
  }
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === " ") { e.preventDefault(); tap(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-[420px]">
        <canvas ref={canvasRef} onClick={tap} className="w-full cursor-pointer rounded-2xl border border-border" />
        {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">加载中…</div>}
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/80">
            <p className="text-lg font-bold">倒了！叠了 {score} 层</p>
            <button className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background" onClick={restart}>再来一局</button>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">层数 <b className="num">{score}</b></div>
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">最高 <b className="num">{best}</b></div>
      </div>
      <p className="text-xs text-muted-foreground">方块从<b>上方落下</b>——点击（或空格）在合适位置放手。真实物理：叠高后塔会<b>左右摇晃</b>，没对齐会倾斜、翻倒。方块宽窄随机、越叠越快，比谁叠得高！</p>
    </div>
  );
}
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.round(r * f)); gg = Math.min(255, Math.round(gg * f)); b = Math.min(255, Math.round(b * f));
  return `rgb(${r},${gg},${b})`;
}
