"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop } from "@/components/demos/canvas";

const W = 520, H = 320, CEIL = 34, FLOOR = 286, PX = 96, PR = 15, G = 2200, MID = (CEIL + FLOOR) / 2, LANE = 2 * PR + 34;
type OKind = "spike" | "crate" | "saw" | "drone" | "laser" | "gate" | "pad";
type Ob = { x: number; kind: OKind; surf: "floor" | "ceil"; w: number; h: number; ph: number; open: "floor" | "ceil"; dead: boolean };
type IKind = "heart" | "shield" | "star" | "clock";
type Item = { x: number; y: number; kind: IKind; ph: number; got: boolean };
type Part = { x: number; y: number; vx: number; vy: number; life: number; col: string };
type S = ReturnType<typeof fresh>;
// 障碍按距离解锁(越靠后越晚登场 → 花样交替递增)
const UNLOCK: { k: OKind; at: number }[] = [
  { k: "spike", at: 0 }, { k: "crate", at: 0 }, { k: "saw", at: 300 },
  { k: "drone", at: 700 }, { k: "gate", at: 1150 }, { k: "laser", at: 1700 }, { k: "pad", at: 2300 },
];
// 场景关键帧：草原 → 沙漠 → 黄昏 → 夜晚(随距离推进)
const STAGES = [
  { sT: [150, 205, 255], sB: [224, 244, 255], g: [126, 188, 92], gD: [88, 148, 64], hl: [150, 200, 122], sun: [255, 238, 152] },
  { sT: [255, 214, 150], sB: [255, 242, 216], g: [216, 184, 120], gD: [184, 150, 92], hl: [222, 192, 142], sun: [255, 224, 140] },
  { sT: [118, 92, 166], sB: [244, 150, 122], g: [132, 98, 122], gD: [94, 70, 92], hl: [154, 112, 142], sun: [255, 182, 122] },
  { sT: [16, 20, 52], sB: [44, 40, 96], g: [40, 46, 72], gD: [24, 30, 52], hl: [56, 60, 100], sun: [214, 224, 255] },
];
function fresh() { return { y: FLOOR - PR, vy: 0, dir: 1, obs: [] as Ob[], items: [] as Item[], parts: [] as Part[], dist: 0, next: 300, nextItem: 460, run: 0, spd: 230, lives: 3, inv: 0, shield: false, star: 0, slow: 0, boost: 0, gems: 0 }; }
// —— 玩家自有 AI 素材(切自3张图，透明底)；未加载时自动回退矢量，绝不因缺图崩溃 ——
const SPR_NAMES = ["robot_run1", "robot_run2", "robot_run3", "robot_run4", "ob_spike", "ob_crate", "ob_crate2", "ob_saw", "ob_drone", "ob_gate", "ob_laser", "ob_pad", "item_heart", "item_shield", "item_star", "item_clock"];
const SPR: Record<string, HTMLImageElement> = {};
function sprite(name: string): HTMLImageElement | null { const im = SPR[name]; return im && im.complete && im.naturalWidth > 0 ? im : null; }
function preloadSprites(onload: () => void) { if (typeof window === "undefined") return; for (const nm of SPR_NAMES) { if (SPR[nm]) continue; const im = new Image(); im.onload = onload; im.onerror = () => {}; im.src = `/games/gravity-run/${nm}.png`; SPR[nm] = im; } }
function blit(ctx: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, w: number, h: number, flipV: boolean) { if (flipV) { ctx.save(); ctx.translate(0, y + h); ctx.scale(1, -1); ctx.drawImage(im, x, 0, w, h); ctx.restore(); } else ctx.drawImage(im, x, y, w, h); }
function blitRot(ctx: CanvasRenderingContext2D, im: HTMLImageElement, cx: number, cy: number, w: number, h: number, ang: number) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore(); }
function robotFrame(run: number) { const f = Math.floor(run * 1.1) % 4; return sprite("robot_run" + (f + 1)) || sprite("robot_run1"); }

export function GravityRunGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gems, setGems] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [, bumpLoad] = useState(0);
  const st = useRef<S>(fresh());
  useEffect(() => { preloadSprites(() => bumpLoad((x) => x + 1)); }, []);

  function reset() { st.current = fresh(); setScore(0); setGems(0); setOver(false); setErr(null); }
  function spawnOb() {
    const s = st.current;
    const avail = UNLOCK.filter((u) => s.dist >= u.at);
    const k = avail[Math.floor(Math.random() * avail.length)].k;
    const surf: "floor" | "ceil" = Math.random() < 0.5 ? "floor" : "ceil";
    const open: "floor" | "ceil" = Math.random() < 0.5 ? "floor" : "ceil";
    let w = 30, h = 44;
    if (k === "crate") { w = 34; h = 30 + (Math.random() < 0.4 ? 34 : 0); }
    else if (k === "spike") { w = 40 + Math.random() * 22; h = 24 + Math.random() * 10; }
    else if (k === "gate") w = 30; else if (k === "laser") w = 34; else if (k === "pad") w = 46;
    s.obs.push({ x: W + 20, kind: k, surf, w, h, ph: Math.random() * 6, open, dead: false });
  }
  function spawnItem() {
    const s = st.current, r = Math.random();
    const kind: IKind = r < 0.30 ? "shield" : r < 0.55 ? "star" : r < 0.78 ? "clock" : "heart";
    s.items.push({ x: W + 20, y: CEIL + 24 + Math.random() * (FLOOR - CEIL - 48), kind, ph: Math.random() * 6, got: false });
  }
  function spark(col: string) { const s = st.current; for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 120; s.parts.push({ x: PX, y: s.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, col }); } }
  function apply(kind: IKind) {
    const s = st.current;
    if (kind === "heart") s.lives = Math.min(5, s.lives + 1);
    else if (kind === "shield") s.shield = true;
    else if (kind === "star") s.star = 4.2;
    else s.slow = 3.2;
    s.gems += 1; setGems(s.gems); spark("#a78bfa");
  }
  function takeHit() {
    const s = st.current; if (s.inv > 0 || s.star > 0) return;
    if (s.shield) { s.shield = false; s.inv = 1.0; spark("#38bdf8"); return; }
    s.lives -= 1; s.inv = 1.5; spark("#f43f5e");
    if (s.lives <= 0) { setBest((b) => Math.max(b, Math.floor(s.dist / 10))); setOver(true); setPlaying(false); }
  }
  function hit(py: number, r: { x: number; y: number; w: number; h: number }) { return PX + PR - 4 > r.x && PX - PR + 4 < r.x + r.w && py + PR - 4 > r.y && py - PR + 4 < r.y + r.h; }

  useRafLoop((dt) => {
    const s = st.current, f = Math.min(dt / 1000, 0.033);
    try {
    s.inv = Math.max(0, s.inv - f); s.star = Math.max(0, s.star - f); s.slow = Math.max(0, s.slow - f); s.boost = Math.max(0, s.boost - f);
    const base = 230 + s.dist * 0.028;
    s.spd = Math.min(540, base * (s.star > 0 ? 1.4 : 1) * (s.boost > 0 ? 1.45 : 1) * (s.slow > 0 ? 0.5 : 1));
    s.run += s.spd * f * 0.05; s.dist += s.spd * f; setScore(Math.floor(s.dist / 10));
    s.vy += G * s.dir * f; s.y += s.vy * f;
    if (s.y > FLOOR - PR) { s.y = FLOOR - PR; s.vy = 0; } if (s.y < CEIL + PR) { s.y = CEIL + PR; s.vy = 0; }
    for (const o of s.obs) { o.x -= s.spd * f; o.ph += (o.kind === "saw" ? 9 : o.kind === "laser" ? 1 : 2.6) * f; }
    s.obs = s.obs.filter((o) => o.x + o.w > -30 && !o.dead);
    for (const it of s.items) { it.x -= s.spd * f; it.ph += 3 * f; }
    s.items = s.items.filter((it) => it.x > -30 && !it.got);
    for (const p of s.parts) { p.x += p.vx * f; p.y += p.vy * f; p.vy += 400 * f; p.life -= f; }
    s.parts = s.parts.filter((p) => p.life > 0);
    if (s.dist > s.next) { spawnOb(); s.next = s.dist + Math.max(150, 300 - s.dist / 40) + Math.random() * 150; }
    if (s.dist > s.nextItem) { spawnItem(); s.nextItem = s.dist + 650 + Math.random() * 650; }
    for (const it of s.items) if (!it.got && Math.hypot(PX - it.x, s.y - it.y) < PR + 16) { it.got = true; apply(it.kind); }
    for (const o of s.obs) {
      if (o.kind === "pad") { if (hit(s.y, box(o)) && s.boost <= 0) s.boost = 1.5; continue; }
      if (o.kind === "laser" && !laserOn(o)) continue;
      if (hit(s.y, box(o))) { if (s.star > 0) { o.dead = true; spark("#fbbf24"); } else takeHit(); }
    }
    render();
    } catch (e) { console.error("[GravityRun] frame error:", e); setPlaying(false); setErr(String((e as Error)?.message || e)); }
  }, playing, canvasRef);
  useEffect(() => { if (err) return; try { render(); } catch (e) { console.error("[GravityRun] render error:", e); setErr(String((e as Error)?.message || e)); } });

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H); const s = st.current; const P = pal(s.dist);
    drawBg(ctx, s, P); drawGroundCeil(ctx, s, P);
    for (const o of s.obs) drawOb(ctx, o);
    for (const it of s.items) drawItem(ctx, it);
    for (const p of s.parts) { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (!(s.inv > 0 && Math.floor(s.inv * 12) % 2 === 0)) drawRobot(ctx, PX, s.y, s.dir, s.run, s);
    drawHUD(ctx, s);
    ctx.fillStyle = P.night ? "rgba(20,26,50,0.65)" : "rgba(255,255,255,0.7)"; ctx.fillRect(W - 96, 8, 84, 22);
    ctx.fillStyle = P.night ? "#fff" : "#1f2740"; ctx.font = "700 15px system-ui"; ctx.fillText(`${Math.floor(s.dist / 10)} m`, W - 88, 24);
    if (!playing && !over) { ctx.fillStyle = "#1f2740"; ctx.font = "14px system-ui"; ctx.textAlign = "center"; ctx.fillText("点击开始 · 再点翻转重力，躲障碍 + 捡道具", W / 2, MID); ctx.textAlign = "left"; }
  }

  function tap() { const s = st.current; if (over || !playing) { reset(); setPlaying(true); return; } s.dir *= -1; }
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === " ") { e.preventDefault(); tap(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });

  return (
    <div className="space-y-3">
      <div className="relative mx-auto w-full max-w-[720px]">
        <canvas ref={canvasRef} onClick={tap} className="w-full cursor-pointer rounded-2xl border border-border" />
        {over && (<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/80"><p className="text-lg font-bold">撞毁了！跑了 {score} m</p><button className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background" onClick={tap}>再来一局</button></div>)}
        {err && (<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/90 p-4 text-center"><p className="text-sm font-semibold">游戏出了点问题</p><p className="max-w-[90%] break-words text-xs text-muted-foreground">{err}</p><button className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-semibold text-background" onClick={() => { reset(); setPlaying(true); }}>重试</button></div>)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">距离 <b className="num">{score}</b> m</div>
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">最远 <b className="num">{best}</b> m</div>
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">道具 <b className="num">{gems}</b></div>
      </div>
      <p className="text-xs text-muted-foreground">点击（或空格）<b>翻转重力</b>，小机器人在地面/天花板间奔跑。<b>3 条命</b>（左上爱心），撞到会掉血并短暂无敌闪烁。障碍各有机制：尖锐<b>地刺</b>、<b>木箱</b>、旋转<b>锯片</b>、乱窜<b>无人机</b>、只能走一侧的<b>护栏门</b>、定时<b>激光</b>、还有会<b>强行加速</b>让你更难躲的加速带。沿途捡道具：<b>❤补血</b>、<b>护盾</b>（挡一次）、<b>⭐无敌冲刺</b>、<b>时缓</b>。越跑越快、花样越多，背景也从草原一路变到星夜！</p>
    </div>
  );
}
/*__C__*/
function box(o: Ob) {
  const span = FLOOR - CEIL;
  switch (o.kind) {
    case "saw": { const yc = (o.surf === "floor" ? FLOOR - 22 : CEIL + 22) + Math.sin(o.ph) * 12; return { x: o.x, y: yc - 19, w: 38, h: 38 }; }
    case "drone": { const y = MID + Math.sin(o.ph) * (span * 0.32); return { x: o.x, y: y - 15, w: 36, h: 30 }; }
    case "gate": { const bh = span - LANE; return o.open === "floor" ? { x: o.x, y: CEIL, w: o.w, h: bh } : { x: o.x, y: FLOOR - bh, w: o.w, h: bh }; }
    case "laser": { const bh = span * 0.62; return o.open === "floor" ? { x: o.x + 15, y: CEIL, w: 8, h: bh } : { x: o.x + 15, y: FLOOR - bh, w: 8, h: bh }; }
    case "pad": return { x: o.x, y: o.surf === "floor" ? FLOOR - 12 : CEIL, w: o.w, h: 12 };
    default: return { x: o.x, y: o.surf === "floor" ? FLOOR - o.h : CEIL, w: o.w, h: o.h };
  }
}
function laserOn(o: Ob) { return (o.ph % 2.4) > 1.5; }
function lerp3(a: number[], b: number[], t: number) { return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]; }
function rgb(a: number[]) { return `rgb(${a[0]},${a[1]},${a[2]})`; }
function shadeArr(a: number[], f: number) { return [Math.min(255, Math.round(a[0] * f)), Math.min(255, Math.round(a[1] * f)), Math.min(255, Math.round(a[2] * f))]; }
function pal(dist: number) {
  const n = STAGES.length;
  const raw = dist / 1400;
  const f = Number.isFinite(raw) ? Math.max(0, Math.min(n - 1, raw)) : 0;
  const i = Math.max(0, Math.min(n - 1, Math.floor(f))), j = Math.min(n - 1, i + 1), t = f - i;
  const a = STAGES[i] || STAGES[0], b = STAGES[j] || STAGES[0];
  return { sT: lerp3(a.sT, b.sT, t), sB: lerp3(a.sB, b.sB, t), g: lerp3(a.g, b.g, t), gD: lerp3(a.gD, b.gD, t), hl: lerp3(a.hl, b.hl, t), sun: lerp3(a.sun, b.sun, t), night: f > 2.4 };
}
type Pal = ReturnType<typeof pal>;
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill(); }
function puff(ctx: CanvasRenderingContext2D, x: number, y: number, sc: number, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha;
  const lobes = [[-20, 4, 12], [-8, 7, 15], [8, 6, 15], [21, 5, 11], [-3, -6, 14], [11, -3, 12]];
  ctx.fillStyle = "rgba(210,220,240,0.85)"; for (const [dx, dy, rd] of lobes) { ctx.beginPath(); ctx.arc(x + dx * sc, y + 3 + dy * sc, rd * sc, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = "#ffffff"; for (const [dx, dy, rd] of lobes) { ctx.beginPath(); ctx.arc(x + dx * sc, y + dy * sc, rd * sc, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function ridgeH(ctx: CanvasRenderingContext2D, baseY: number, amp: number, wob: number, phase: number, col: string, alpha: number) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, baseY);
  for (let x = 0; x <= W; x += 8) { const yy = baseY - amp * (0.5 + 0.5 * Math.sin((x + phase) / wob)) - amp * 0.28 * Math.sin((x + phase) / (wob * 0.42)); ctx.lineTo(x, yy); }
  ctx.lineTo(W, baseY); ctx.closePath(); ctx.fill(); ctx.restore();
}
/*__D__*/
function drawBg(ctx: CanvasRenderingContext2D, s: S, P: Pal) {
  const sky = ctx.createLinearGradient(0, 0, 0, FLOOR); sky.addColorStop(0, rgb(P.sT)); sky.addColorStop(1, rgb(P.sB)); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, FLOOR);
  const sunX = (((W * 0.7 - s.dist * 0.02) % (W + 160)) + W + 160) % (W + 160) - 80, sunY = 78;
  const gl = ctx.createRadialGradient(sunX, sunY, 6, sunX, sunY, 70); gl.addColorStop(0, `rgba(${P.sun[0]},${P.sun[1]},${P.sun[2]},0.6)`); gl.addColorStop(1, `rgba(${P.sun[0]},${P.sun[1]},${P.sun[2]},0)`); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(sunX, sunY, 70, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rgb(P.sun); ctx.beginPath(); ctx.arc(sunX, sunY, 24, 0, Math.PI * 2); ctx.fill();
  if (P.night) for (let k = 0; k < 50; k++) { const x = (k * 83 + 20) % W, y = (k * 47) % MID, tw = 0.4 + 0.6 * Math.abs(Math.sin(k + s.dist * 0.004)); ctx.fillStyle = `rgba(255,255,255,${tw * 0.8})`; ctx.beginPath(); ctx.arc(x, y, k % 5 === 0 ? 1.6 : 1, 0, Math.PI * 2); ctx.fill(); }
  ridgeH(ctx, FLOOR, 92, 150, s.dist * 0.05, rgb(shadeArr(P.hl, 0.92)), 0.55);
  ridgeH(ctx, FLOOR, 62, 96, s.dist * 0.11, rgb(shadeArr(P.hl, 0.78)), 0.85);
  if (!P.night) { const span = W + 160; for (let k = 0; k < 4; k++) { let cx = ((k * 168 + 60) - s.dist * 0.12) % span; if (cx < 0) cx += span; cx -= 80; puff(ctx, cx, 58 + (k % 2) * 34, 0.8 + (k % 2) * 0.2, 0.85); } }
}
function drawGroundCeil(ctx: CanvasRenderingContext2D, s: S, P: Pal) {
  const fg = ctx.createLinearGradient(0, FLOOR, 0, H); fg.addColorStop(0, rgb(P.g)); fg.addColorStop(1, rgb(P.gD)); ctx.fillStyle = fg; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = rgb(shadeArr(P.g, 1.12)); ctx.fillRect(0, FLOOR, W, 4);
  const cg = ctx.createLinearGradient(0, 0, 0, CEIL); cg.addColorStop(0, rgb(P.gD)); cg.addColorStop(1, rgb(P.g)); ctx.fillStyle = cg; ctx.fillRect(0, 0, W, CEIL);
  ctx.fillStyle = rgb(shadeArr(P.g, 1.12)); ctx.fillRect(0, CEIL - 4, W, 4);
  ctx.fillStyle = rgb(shadeArr(P.g, 0.8));
  for (let x = -(s.dist % 40); x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, FLOOR); ctx.lineTo(x + 5, FLOOR - 6); ctx.lineTo(x + 10, FLOOR); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, CEIL); ctx.lineTo(x + 5, CEIL + 6); ctx.lineTo(x + 10, CEIL); ctx.closePath(); ctx.fill(); }
  ctx.strokeStyle = "rgba(0,0,0,0.10)"; ctx.lineWidth = 1; for (let x = -(s.dist % 60); x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, FLOOR + 12); ctx.lineTo(x + 18, FLOOR + 12); ctx.stroke(); }
}
/*__E__*/
function drawOb(ctx: CanvasRenderingContext2D, o: Ob) {
  const r = box(o), cx = r.x + r.w / 2, floorS = o.surf === "floor";
  if (o.kind === "spike") {
    const im = sprite("ob_spike"); if (im) { blit(ctx, im, r.x, r.y, r.w, r.h, !floorS); return; }
    const n = Math.max(2, Math.round(r.w / 12)), seg = r.w / n;
    const grad = ctx.createLinearGradient(0, floorS ? FLOOR - r.h : CEIL, 0, floorS ? FLOOR : CEIL + r.h); grad.addColorStop(0, "#cfd6e4"); grad.addColorStop(1, "#7c8598"); ctx.fillStyle = grad;
    for (let i = 0; i < n; i++) { const bx = r.x + i * seg; ctx.beginPath(); if (floorS) { ctx.moveTo(bx, FLOOR); ctx.lineTo(bx + seg / 2, FLOOR - r.h); ctx.lineTo(bx + seg, FLOOR); } else { ctx.moveTo(bx, CEIL); ctx.lineTo(bx + seg / 2, CEIL + r.h); ctx.lineTo(bx + seg, CEIL); } ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = "rgba(255,255,255,0.6)"; for (let i = 0; i < n; i++) ctx.fillRect(r.x + i * seg + seg / 2 - 0.7, floorS ? FLOOR - r.h + 3 : CEIL + 2, 1.4, 5);
  } else if (o.kind === "crate") {
    const im = sprite(o.h > 40 ? "ob_crate2" : "ob_crate"); if (im) { blit(ctx, im, r.x, r.y, r.w, r.h, false); return; }
    const gg = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h); gg.addColorStop(0, "#dc9b58"); gg.addColorStop(1, "#a9702f"); ctx.fillStyle = gg; rr(ctx, r.x, r.y, r.w, r.h, 3);
    ctx.strokeStyle = "#7c5222"; ctx.lineWidth = 2.5; ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
    ctx.beginPath(); ctx.moveTo(r.x + 2, r.y + 2); ctx.lineTo(r.x + r.w - 2, r.y + r.h - 2); ctx.moveTo(r.x + r.w - 2, r.y + 2); ctx.lineTo(r.x + 2, r.y + r.h - 2); ctx.stroke();
    ctx.fillStyle = "#5b4321"; for (const [px, py] of [[r.x, r.y], [r.x + r.w - 5, r.y], [r.x, r.y + r.h - 5], [r.x + r.w - 5, r.y + r.h - 5]]) ctx.fillRect(px, py, 5, 5);
  } else if (o.kind === "saw") {
    const yc = (floorS ? FLOOR - 22 : CEIL + 22) + Math.sin(o.ph) * 12;
    ctx.strokeStyle = "#6b7488"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, floorS ? FLOOR : CEIL); ctx.lineTo(cx, yc); ctx.stroke();
    const im = sprite("ob_saw"); if (im) { blitRot(ctx, im, cx, yc, 46, 46, o.ph * 3); return; }
    ctx.save(); ctx.translate(cx, yc); ctx.rotate(o.ph * 3); ctx.fillStyle = "#c2cad8"; for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(6, -25); ctx.lineTo(-6, -25); ctx.closePath(); ctx.fill(); }
    const bg = ctx.createRadialGradient(-4, -4, 3, 0, 0, 17); bg.addColorStop(0, "#eef1f6"); bg.addColorStop(1, "#8b95a8"); ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#5b6480"; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  } else if (o.kind === "drone") {
    const y = MID + Math.sin(o.ph) * ((FLOOR - CEIL) * 0.32);
    const dim = sprite("ob_drone"); if (dim) { blit(ctx, dim, cx - 20, y - 17, 40, 34, false); return; }
    const spin = Math.sin(o.ph * 20) * 10;
    ctx.strokeStyle = "rgba(120,130,150,0.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 18 - spin, y - 14); ctx.lineTo(cx - 18 + spin, y - 14); ctx.moveTo(cx + 18 - spin, y - 14); ctx.lineTo(cx + 18 + spin, y - 14); ctx.stroke();
    ctx.strokeStyle = "#5b6480"; ctx.beginPath(); ctx.moveTo(cx - 12, y - 8); ctx.lineTo(cx - 18, y - 14); ctx.moveTo(cx + 12, y - 8); ctx.lineTo(cx + 18, y - 14); ctx.stroke();
    const bg = ctx.createLinearGradient(cx, y - 10, cx, y + 10); bg.addColorStop(0, "#e86a7a"); bg.addColorStop(1, "#c23142"); ctx.fillStyle = bg; rr(ctx, cx - 16, y - 10, 32, 20, 8);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx - 6, y, 3.4, 0, Math.PI * 2); ctx.arc(cx + 6, y, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1f2740"; ctx.beginPath(); ctx.arc(cx - 6, y, 1.6, 0, Math.PI * 2); ctx.arc(cx + 6, y, 1.6, 0, Math.PI * 2); ctx.fill();
  } else if (o.kind === "gate") {
    const gim = sprite("ob_gate"); if (gim) { blit(ctx, gim, r.x, r.y, r.w, r.h, false); const gy = o.open === "floor" ? FLOOR - LANE / 2 : CEIL + LANE / 2; ctx.fillStyle = "rgba(72,220,140,0.28)"; ctx.fillRect(r.x, gy - LANE / 2, r.w, LANE); return; }
    ctx.fillStyle = "#3a4252"; rr(ctx, r.x, r.y, r.w, r.h, 3); ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip(); ctx.strokeStyle = "#f5c542"; ctx.lineWidth = 6; for (let d = -r.h; d < r.w + r.h; d += 16) { ctx.beginPath(); ctx.moveTo(r.x + d, r.y); ctx.lineTo(r.x + d - r.h, r.y + r.h); ctx.stroke(); } ctx.restore();
    const oy = o.open === "floor" ? FLOOR - LANE / 2 : CEIL + LANE / 2; ctx.fillStyle = "rgba(72,220,140,0.35)"; ctx.fillRect(r.x, oy - LANE / 2, r.w, LANE);
  } else if (o.kind === "laser") {
    const on = laserOn(o), c = o.ph % 2.4, charging = c > 1.1 && c <= 1.5, top = o.open === "floor", ex = cx;
    const lim = sprite("ob_laser");
    if (lim) { const es = 22; blit(ctx, lim, ex - es / 2, top ? CEIL - 2 : FLOOR - 2 - es, es, es, top); }
    else { ctx.fillStyle = "#3a4658"; ctx.fillRect(ex - 8, top ? CEIL - 2 : FLOOR - 6, 16, 8); ctx.fillStyle = on ? "#ff5a5a" : charging ? "#ffcf5a" : "#6b7488"; ctx.beginPath(); ctx.arc(ex, top ? CEIL + 4 : FLOOR - 4, 4, 0, Math.PI * 2); ctx.fill(); }
    if (on) { const bg = ctx.createLinearGradient(ex - 5, 0, ex + 5, 0); bg.addColorStop(0, "rgba(255,80,80,0)"); bg.addColorStop(0.5, "rgba(255,90,90,0.9)"); bg.addColorStop(1, "rgba(255,80,80,0)"); ctx.fillStyle = bg; ctx.fillRect(r.x - 3, r.y, r.w + 6, r.h); ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(cx - 1.5, r.y, 3, r.h); }
    else if (charging) { ctx.strokeStyle = "rgba(255,200,90,0.55)"; ctx.setLineDash([3, 5]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, r.y); ctx.lineTo(cx, r.y + r.h); ctx.stroke(); ctx.setLineDash([]); }
  } else {
    const y = floorS ? FLOOR - 12 : CEIL;
    const pim = sprite("ob_pad"); if (pim) { blit(ctx, pim, r.x, y - 2, r.w, 16, false); return; }
    ctx.fillStyle = "#0ea5e9"; rr(ctx, r.x, y, r.w, 12, 3);
    ctx.fillStyle = "rgba(255,255,255,0.9)"; for (let i = 0; i < 3; i++) { const ax = r.x + 9 + i * 12; ctx.beginPath(); ctx.moveTo(ax, y + 3); ctx.lineTo(ax + 6, y + 6); ctx.lineTo(ax, y + 9); ctx.closePath(); ctx.fill(); }
  }
}
/*__F__*/
function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.9); ctx.bezierCurveTo(x - s * 1.3, y - s * 0.4, x - s * 0.5, y - s * 1.1, x, y - s * 0.35); ctx.bezierCurveTo(x + s * 0.5, y - s * 1.1, x + s * 1.3, y - s * 0.4, x, y + s * 0.9); ctx.closePath(); ctx.fill(); }
function starIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rad = i % 2 ? r * 0.45 : r, a = (i / 10) * Math.PI * 2 - Math.PI / 2; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } ctx.closePath(); ctx.fill(); }
function shieldIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) { ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.8, y - s * 0.5); ctx.lineTo(x + s * 0.8, y + s * 0.2); ctx.quadraticCurveTo(x + s * 0.8, y + s, x, y + s * 1.1); ctx.quadraticCurveTo(x - s * 0.8, y + s, x - s * 0.8, y + s * 0.2); ctx.lineTo(x - s * 0.8, y - s * 0.5); ctx.closePath(); ctx.fill(); }
function drawItem(ctx: CanvasRenderingContext2D, it: Item) {
  const y = it.y + Math.sin(it.ph) * 4, gc = it.kind === "heart" ? "244,63,94" : it.kind === "shield" ? "56,189,248" : it.kind === "star" ? "251,191,36" : "167,139,250";
  const gl = ctx.createRadialGradient(it.x, y, 2, it.x, y, 18); gl.addColorStop(0, `rgba(${gc},0.55)`); gl.addColorStop(1, `rgba(${gc},0)`); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(it.x, y, 18, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(it.x, y);
  if (it.kind === "heart") { const im = sprite("item_heart"); if (im) ctx.drawImage(im, -13, -13, 26, 26); else { ctx.fillStyle = "#f43f5e"; heart(ctx, 0, 0, 9); } }
  else if (it.kind === "shield") { const im = sprite("item_shield"); if (im) ctx.drawImage(im, -13, -13, 26, 26); else { ctx.fillStyle = "#38bdf8"; shieldIcon(ctx, 0, 0, 10); ctx.fillStyle = "rgba(255,255,255,0.6)"; shieldIcon(ctx, 0, -1, 5); } }
  else if (it.kind === "star") { const im = sprite("item_star"); if (im) ctx.drawImage(im, -13, -13, 26, 26); else { ctx.fillStyle = "#fbbf24"; starIcon(ctx, 0, 0, 10); } }
  else { const im = sprite("item_clock"); if (im) ctx.drawImage(im, -13, -13, 26, 26); else { ctx.fillStyle = "#ede9fe"; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -5); ctx.moveTo(0, 0); ctx.lineTo(4, 2); ctx.stroke(); } }
  ctx.restore();
}
/*__G__*/
function drawLeg(ctx: CanvasRenderingContext2D, ox: number, sw: number) {
  ctx.save(); ctx.translate(ox, 6); const kx = Math.sin(sw * 0.5) * 5, ky = 5, fx = kx + Math.sin(sw) * 4;
  ctx.strokeStyle = "#5b4bb0"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(kx, ky); ctx.lineTo(fx, ky + 6); ctx.stroke();
  ctx.fillStyle = "#2f2760"; ctx.beginPath(); ctx.ellipse(fx, ky + 7, 3.4, 2.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function drawRobot(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, run: number, s: S) {
  const now = performance.now(), TAU = Math.PI * 2;
  const rim = robotFrame(run);
  if (rim) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, dir);
    if (s.star > 0) { const gl = ctx.createRadialGradient(0, 0, 3, 0, 0, 30), h = (now / 6) % 360; gl.addColorStop(0, `hsla(${h},90%,70%,0.6)`); gl.addColorStop(1, `hsla(${h},90%,70%,0)`); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill(); }
    const H = 44, W = H * rim.naturalWidth / rim.naturalHeight;
    ctx.drawImage(rim, -W / 2, PR + 3 - H, W, H);
    ctx.restore();
    if (s.shield) { ctx.save(); ctx.strokeStyle = "rgba(56,189,248,0.9)"; ctx.lineWidth = 2.5; ctx.fillStyle = "rgba(56,189,248,0.12)"; ctx.beginPath(); ctx.arc(x, y, PR + 10, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
    return;
  }
  ctx.save(); ctx.translate(x, y); ctx.scale(1, dir); ctx.scale(0.82, 0.82);
  if (s.star > 0) { const gl = ctx.createRadialGradient(0, 0, 3, 0, 0, 26), h = (now / 6) % 360; gl.addColorStop(0, `hsla(${h},90%,70%,0.6)`); gl.addColorStop(1, `hsla(${h},90%,70%,0)`); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill(); }
  const s1 = Math.sin(run), s2 = Math.sin(run + Math.PI);
  drawLeg(ctx, -4, s1); drawLeg(ctx, 4, s2);
  ctx.save(); ctx.translate(7, -3); ctx.rotate(-s1 * 0.5); ctx.fillStyle = "#5b4bb0"; rr(ctx, -2.4, 0, 4.8, 10, 2.4); ctx.restore();
  const body = ctx.createLinearGradient(-11, -10, 11, 9); body.addColorStop(0, "#cdbcff"); body.addColorStop(0.45, "#9a7cf8"); body.addColorStop(1, "#6f52d6"); ctx.fillStyle = body; rr(ctx, -11, -10, 22, 20, 7);
  ctx.fillStyle = "#7c5cf6"; rr(ctx, -12.5, -9, 5, 8, 2.5); rr(ctx, 7.5, -9, 5, 8, 2.5);
  ctx.fillStyle = "rgba(255,255,255,0.26)"; rr(ctx, -8, -7, 5, 14, 2.5);
  ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(9, -6); ctx.lineTo(9, 5); ctx.stroke();
  ctx.strokeStyle = "rgba(40,28,80,0.4)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke();
  const pulse = 0.55 + 0.45 * Math.sin(now / 180);
  const cg = ctx.createRadialGradient(0, 2, 0.5, 0, 2, 6); cg.addColorStop(0, `rgba(150,255,235,${pulse})`); cg.addColorStop(1, "rgba(90,220,200,0)"); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(0, 2, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = "#0f766e"; ctx.beginPath(); ctx.arc(0, 2, 3, 0, TAU); ctx.fill(); ctx.fillStyle = `rgba(205,255,248,${0.6 + 0.4 * pulse})`; ctx.beginPath(); ctx.arc(0, 2, 1.6, 0, TAU); ctx.fill();
  ctx.save(); ctx.translate(-7, -3); ctx.rotate(s1 * 0.6); ctx.fillStyle = "#8567e6"; rr(ctx, -2.4, 0, 4.8, 10, 2.4); ctx.fillStyle = "#c9bdff"; ctx.beginPath(); ctx.arc(0, 10, 2.4, 0, TAU); ctx.fill(); ctx.restore();
  const hg = ctx.createLinearGradient(0, -22, 0, -9); hg.addColorStop(0, "#e7e0ff"); hg.addColorStop(1, "#a58ff2"); ctx.fillStyle = hg; rr(ctx, -8, -22, 16, 13, 6);
  ctx.fillStyle = "#6f52d6"; ctx.beginPath(); ctx.arc(-8, -15, 2.2, 0, TAU); ctx.arc(8, -15, 2.2, 0, TAU); ctx.fill();
  ctx.fillStyle = "#171a33"; rr(ctx, -6, -20, 12, 7, 3.4);
  const eg = ctx.createLinearGradient(-5, 0, 5, 0); eg.addColorStop(0, "#5eead4"); eg.addColorStop(0.5, "#b6fff2"); eg.addColorStop(1, "#5eead4"); ctx.fillStyle = eg; rr(ctx, -4.5, -18.4, 9, 3, 1.5);
  ctx.strokeStyle = "#a58ff2"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -27); ctx.stroke();
  const blink = Math.sin(now / 150) > 0; if (blink) { const bl = ctx.createRadialGradient(0, -28, 0, 0, -28, 4); bl.addColorStop(0, "rgba(255,120,150,0.9)"); bl.addColorStop(1, "rgba(255,120,150,0)"); ctx.fillStyle = bl; ctx.beginPath(); ctx.arc(0, -28, 4, 0, TAU); ctx.fill(); }
  ctx.fillStyle = blink ? "#ff5a7a" : "#7a2a3a"; ctx.beginPath(); ctx.arc(0, -28, 2, 0, TAU); ctx.fill();
  ctx.restore();
  if (s.shield) { ctx.save(); ctx.strokeStyle = "rgba(56,189,248,0.9)"; ctx.lineWidth = 2.5; ctx.fillStyle = "rgba(56,189,248,0.12)"; ctx.beginPath(); ctx.arc(x, y, PR + 8, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); }
}
function drawHUD(ctx: CanvasRenderingContext2D, s: S) {
  const n = Math.max(3, s.lives), hi = sprite("item_heart");
  for (let i = 0; i < n; i++) { ctx.globalAlpha = i < s.lives ? 1 : 0.25; if (hi) ctx.drawImage(hi, 8 + i * 20, 8, 18, 18); else { ctx.fillStyle = "#f43f5e"; heart(ctx, 16 + i * 19, 18, 7); } }
  ctx.globalAlpha = 1;
  const badges: [string, string][] = [];
  if (s.shield) badges.push(["护盾", "#38bdf8"]);
  if (s.star > 0) badges.push([`无敌 ${s.star.toFixed(1)}`, "#f59e0b"]);
  if (s.slow > 0) badges.push([`时缓 ${s.slow.toFixed(1)}`, "#a78bfa"]);
  if (s.boost > 0) badges.push(["强制加速!", "#ef4444"]);
  ctx.font = "700 11px system-ui"; let by = 42;
  for (const [t, col] of badges) { ctx.fillStyle = col; ctx.fillText(t, 14, by); by += 15; }
}
