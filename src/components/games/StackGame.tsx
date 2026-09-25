"use client";
import { useEffect, useRef, useState } from "react";
import type { Body, Engine } from "matter-js";
import { fitCanvas, C } from "@/components/demos/canvas";

const W = 360, H = 440, BH = 26, GROUND = 400, DROP_GAP = 128;
const TONES = ["#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#ec4899"];
type Blk = { body: Body; w: number; col: string };
type G = {
  M: typeof import("matter-js"); engine: Engine; blocks: Blk[];
  carrier: { x: number; w: number; dir: number; y: number };
  phase: "aim" | "fall"; prevTop: number; camY: number; settle: number; dropped: Blk | null; over: boolean;
};
// 暖色天空关键帧(黎明→白昼→暮色)，与「弹跳上升」的冷色太空明确区分
const SK = [[[255, 206, 158], [255, 238, 214]], [[126, 182, 240], [212, 235, 255]], [[74, 58, 122], [216, 132, 150]]];

export function StackGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const [ready, setReady] = useState(false);
  const g = useRef<G | null>(null);

  useEffect(() => {
    let raf = 0, mounted = true;
    import("matter-js").then((M) => {
      if (!mounted) return;
      const engine = M.Engine.create(); engine.gravity.y = 1.0;
      const ground = M.Bodies.rectangle(W / 2, GROUND + 40, W * 3, 80, { isStatic: true });
      M.Composite.add(engine.world, ground);
      g.current = { M, engine, blocks: [], carrier: { x: W / 2, w: 120, dir: 1, y: GROUND - 40 }, phase: "aim", prevTop: GROUND, camY: 0, settle: 0, dropped: null, over: false };
      addBase(); newCarrier(); setReady(true);
      const loop = () => { step(); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    });
    return () => { mounted = false; cancelAnimationFrame(raf); const s = g.current; if (s) { s.M.Composite.clear(s.engine.world, false); s.M.Engine.clear(s.engine); } };
  }, []);

  function addBase() { const s = g.current!; const w = 132, b = s.M.Bodies.rectangle(W / 2, GROUND - BH / 2, w, BH, { friction: 1, frictionStatic: 2, frictionAir: 0.02 }); s.M.Composite.add(s.engine.world, b); s.blocks.push({ body: b, w, col: TONES[0] }); s.prevTop = GROUND - BH; }
  function blockW(n: number) { const t = Math.min(1, n / 24); const maxW = 108 - t * 44, minW = 84 - t * 42; return minW + Math.random() * (maxW - minW); }
  function newCarrier() { const s = g.current!; const w = blockW(s.blocks.length); s.carrier = { x: W / 2, w, dir: Math.random() < 0.5 ? 1 : -1, y: s.prevTop - DROP_GAP }; s.phase = "aim"; }
  function drop() {
    const s = g.current; if (!s || s.over) return;
    if (s.phase !== "aim") return;
    const b = s.M.Bodies.rectangle(s.carrier.x, s.carrier.y, s.carrier.w, BH, { friction: 1, frictionStatic: 2, frictionAir: 0.02, restitution: 0 });
    s.M.Composite.add(s.engine.world, b);
    const blk = { body: b, w: s.carrier.w, col: TONES[s.blocks.length % TONES.length] };
    s.blocks.push(blk); s.dropped = blk; s.phase = "fall"; s.settle = 0;
  }

  function step() {
    const s = g.current; if (!s) return;
    s.M.Engine.update(s.engine, 1000 / 60);
    if (!s.over) {
      if (s.phase === "aim") { const c = s.carrier; c.x += c.dir * (1.5 + s.blocks.length * 0.09); if (c.x < c.w / 2) { c.x = c.w / 2; c.dir = 1; } if (c.x > W - c.w / 2) { c.x = W - c.w / 2; c.dir = -1; } }
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
    const u = Math.min(1, Math.max(0, -cam) / 2600);
    drawBg(ctx, cam, u);
    const gy = GROUND - cam;
    if (gy < H + 40) { const gg = ctx.createLinearGradient(0, gy, 0, H); gg.addColorStop(0, "#c9a878"); gg.addColorStop(1, "#a2814c"); ctx.fillStyle = gg; ctx.fillRect(0, gy, W, H - gy + 2); ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(0, gy, W, 4); }
    for (const b of s.blocks) drawBlk(ctx, b, cam);
    if (s.phase === "aim" && !s.over) {
      const c = s.carrier, y = c.y - cam, col = TONES[s.blocks.length % TONES.length];
      ctx.strokeStyle = "rgba(60,70,104,0.45)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(c.x, y - BH / 2); ctx.lineTo(c.x, 6); ctx.stroke();
      ctx.fillStyle = "#3a4668"; ctx.fillRect(c.x - 12, 2, 24, 8);
      drawRect(ctx, c.x, y, c.w, BH, 0, shade(col, 1.18), col);
      ctx.strokeStyle = "rgba(60,70,104,0.3)"; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(c.x, y + BH / 2); ctx.lineTo(c.x, gy); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = C.ink; ctx.font = "700 18px system-ui"; ctx.fillText(`${score}`, 14, 30);
  }
  function drawBlk(ctx: CanvasRenderingContext2D, b: Blk, cam: number) { drawRect(ctx, b.body.position.x, b.body.position.y - cam, b.w, BH, b.body.angle, shade(b.col, 1.18), b.col); }
  function drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ang: number, top: string, bot: string) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.shadowColor = "rgba(30,40,70,0.20)"; ctx.shadowBlur = 7; ctx.shadowOffsetY = 3;
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2); grad.addColorStop(0, top); grad.addColorStop(1, bot);
    ctx.fillStyle = grad; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = shade(bot, 0.8); ctx.lineWidth = 1.5; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 3);
    ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.fillRect(-w / 2 + 3, h / 2 - 5, w - 6, 2);
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
      <div className="relative mx-auto w-full max-w-[440px]">
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
      <p className="text-xs text-muted-foreground">方块从<b>上方落下</b>——点击（或空格）在合适位置放手。真实物理：叠高后塔会<b>左右摇晃</b>，没对齐会倾斜、翻倒。<b>开局又宽又稳</b>，越往上越窄越快，比谁叠得高！</p>
    </div>
  );
}

// ——— 背景与绘制工具 ———
function lerp3(a: number[], b: number[], t: number) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
function rgb(a: number[]) { return `rgb(${a[0]},${a[1]},${a[2]})`; }
function puff(ctx: CanvasRenderingContext2D, x: number, y: number, sc: number, alpha: number) {
  if (alpha <= 0.02) return;
  ctx.save(); ctx.globalAlpha = alpha;
  const lobes = [[-22, 4, 13], [-9, 7, 17], [9, 7, 16], [23, 5, 12], [-4, -6, 15], [12, -3, 13]];
  ctx.fillStyle = "#c6d4ee"; for (const [dx, dy, r] of lobes) { ctx.beginPath(); ctx.arc(x + dx * sc, y + 3 + dy * sc, r * sc, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#ffffff"; for (const [dx, dy, r] of lobes) { ctx.beginPath(); ctx.arc(x + dx * sc, y + dy * sc, r * sc, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function ridge(ctx: CanvasRenderingContext2D, baseY: number, amp: number, wob: number, col: string) {
  if (baseY < -amp) return;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H + 2); ctx.lineTo(0, baseY);
  for (let x = 0; x <= W; x += 8) { const yy = baseY - amp * (0.5 + 0.5 * Math.sin(x / wob + 1)) - amp * 0.25 * Math.sin(x / (wob * 0.4)); ctx.lineTo(x, yy); }
  ctx.lineTo(W, H + 2); ctx.closePath(); ctx.fill();
}
function drawBg(ctx: CanvasRenderingContext2D, cam: number, u: number) {
  const alt = Math.max(0, -cam);
  let top, bot;
  if (u < 0.5) { const t = u / 0.5; top = lerp3(SK[0][0], SK[1][0], t); bot = lerp3(SK[0][1], SK[1][1], t); }
  else { const t = (u - 0.5) / 0.5; top = lerp3(SK[1][0], SK[2][0], t); bot = lerp3(SK[1][1], SK[2][1], t); }
  const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, rgb(top)); sky.addColorStop(1, rgb(bot));
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  if (u > 0.5) { const a = (u - 0.5) / 0.5; for (let k = 0; k < 46; k++) { const sx = (k * 67 + 13) % W, sy = (k * 89 + 30) % (H - 20); const tw = 0.4 + 0.6 * Math.abs(Math.sin(k + alt * 0.004)); ctx.fillStyle = `rgba(255,255,255,${a * tw * 0.7})`; ctx.beginPath(); ctx.arc(sx, sy, k % 4 === 0 ? 1.7 : 1, 0, Math.PI * 2); ctx.fill(); } }
  const sunY = 78 + alt * 0.05, sunX = W * 0.74;
  if (sunY < H + 40) {
    const sc = lerp3([255, 205, 118], [255, 247, 234], Math.min(1, u * 1.5));
    const gl = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 96); gl.addColorStop(0, `rgba(${sc[0]},${sc[1]},${sc[2]},0.5)`); gl.addColorStop(1, "rgba(255,240,210,0)"); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sunX, sunY, 96, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgb(sc); ctx.beginPath(); ctx.arc(sunX, sunY, 26, 0, Math.PI * 2); ctx.fill();
  }
  ridge(ctx, GROUND - cam * 0.3, 52, 96, `rgba(126,144,182,${0.5 * (1 - u * 0.7)})`);
  ridge(ctx, GROUND - cam * 0.42, 40, 64, `rgba(96,116,158,${0.6 * (1 - u * 0.7)})`);
  const by = GROUND - cam * 0.55;
  if (by < H + 120 && u < 0.85) { ctx.save(); ctx.globalAlpha = 1 - u * 0.9; for (let i = 0; i < 11; i++) { const bx = i * 34 - 6, bw = 22 + (i % 3) * 6, bh = 40 + ((i * 53) % 60); ctx.fillStyle = "#5a6a92"; ctx.fillRect(bx, by - bh, bw, bh + 220); ctx.fillStyle = "rgba(255,238,178,0.55)"; for (let wy = by - bh + 6; wy < by - 6; wy += 12) for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) if ((wx + wy) % 3 === 0) ctx.fillRect(wx, wy, 3, 4); } ctx.restore(); }
  const span = H + 160;
  for (let k = 0; k < 6; k++) { let cy = ((k * 179 + 50) - cam * 0.5) % span; if (cy < 0) cy += span; cy -= 80; const cx = (k * 143 + 30) % W; puff(ctx, cx, cy, 0.75 + (k % 3) * 0.22, 0.85 * (1 - u * 0.75)); }
  if (u < 0.55) { ctx.strokeStyle = `rgba(60,70,100,${0.42 * (1 - u * 1.6)})`; ctx.lineWidth = 1.6; for (let k = 0; k < 3; k++) { let b2 = ((k * 211 + 120) - cam * 0.4) % span; if (b2 < 0) b2 += span; b2 -= 80; const bx = (k * 97 + 70) % W; ctx.beginPath(); ctx.moveTo(bx - 6, b2); ctx.quadraticCurveTo(bx, b2 - 4, bx + 6, b2); ctx.moveTo(bx + 6, b2); ctx.quadraticCurveTo(bx + 12, b2 - 4, bx + 18, b2); ctx.stroke(); } }
}
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.round(r * f)); gg = Math.min(255, Math.round(gg * f)); b = Math.min(255, Math.round(b * f));
  return `rgb(${r},${gg},${b})`;
}
