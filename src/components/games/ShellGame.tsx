"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop } from "@/components/demos/canvas";
import { Button } from "@/components/ui/button";

const W = 460, H = 300, SLOTX = [120, 230, 340], GY = 182, R = 42;
type Shell = { slot: number; x: number };

export function ShellGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [msg, setMsg] = useState("记住小球在哪个椰子壳下");
  const [over, setOver] = useState(false);
  const rr = useRef({ round: 0 }); rr.current = { round };
  const st = useRef({
    phase: "reveal" as "reveal" | "shuffle" | "guess" | "result" | "over",
    timer: 0, lift: 0, ballId: 0, swapsLeft: 0, gap: 0,
    shells: [0, 1, 2].map((s) => ({ slot: s, x: SLOTX[s] })) as Shell[],
    active: null as null | { a: Shell; b: Shell }, picked: -1, correct: false,
  });

  function startRound(n: number) {
    const s = st.current;
    s.phase = "reveal"; s.timer = 0; s.lift = 0; s.picked = -1;
    s.ballId = Math.floor(Math.random() * 3);
    s.shells = [0, 1, 2].map((sl) => ({ slot: sl, x: SLOTX[sl] }));
    s.swapsLeft = 2 + n; s.active = null; s.gap = 0; // 从 2 次开始，逐轮 +1
  }
  useEffect(() => { startRound(0); }, []);

  function drawShell(ctx: CanvasRenderingContext2D, x: number, lift: number) {
    const yy = GY - lift;
    ctx.fillStyle = "rgba(50,32,14,0.20)"; ctx.beginPath(); ctx.ellipse(x, GY + 8, R * 0.95, R * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    // 壳体（球面径向渐变，左上高光）
    const g = ctx.createRadialGradient(x - R * 0.35, yy - R * 0.5, R * 0.15, x, yy, R * 1.15);
    g.addColorStop(0, "#b9814c"); g.addColorStop(0.45, "#8a562b"); g.addColorStop(0.8, "#653c1c"); g.addColorStop(1, "#4a2b12");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, yy, R, R * 1.02, 0, Math.PI, Math.PI * 2); ctx.fill();
    // 开口(前缘)与内壁阴影
    ctx.fillStyle = "#3d2410"; ctx.beginPath(); ctx.ellipse(x, yy, R, R * 0.3, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = "#2c1808"; ctx.beginPath(); ctx.ellipse(x, yy, R * 0.82, R * 0.22, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = "#7a4a22"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(x, yy, R, R * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
    // 椰壳纤维纹理（多条弯曲竖纹）
    ctx.strokeStyle = "rgba(58,33,12,0.4)"; ctx.lineWidth = 1;
    for (let a = -5; a <= 5; a++) { const s = a / 5.5; ctx.beginPath(); ctx.moveTo(x + s * R * 0.35, yy - R * 0.98); ctx.quadraticCurveTo(x + s * R * 1.05, yy - R * 0.3, x + s * R * 0.9, yy - 1); ctx.stroke(); }
    // 斑点质感
    ctx.fillStyle = "rgba(255,235,200,0.12)"; for (let i = 0; i < 10; i++) { const a = Math.PI + (i / 10) * Math.PI, rr2 = R * (0.5 + (i % 3) * 0.15); ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr2, yy + Math.sin(a) * rr2 * 0.9, 1.6, 0, Math.PI * 2); ctx.fill(); }
    // 三个椰眼
    ctx.fillStyle = "#301b07"; [-11, 1, 12].forEach((dx, i) => { ctx.beginPath(); ctx.arc(x + dx, yy - R * (0.58 - i * 0.03), 2.8, 0, Math.PI * 2); ctx.fill(); });
    // 顶部高光
    ctx.fillStyle = "rgba(255,240,210,0.28)"; ctx.beginPath(); ctx.ellipse(x - R * 0.32, yy - R * 0.55, R * 0.22, R * 0.32, -0.5, 0, Math.PI * 2); ctx.fill();
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H); const s = st.current;
    const t = performance.now() / 1000;
    // 暖色舞台背景 + 挂布 + 顶部聚光锥 + 圆木桌 + 暗角 + 尘埃
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#4a3626"); bg.addColorStop(0.55, "#5b3f28"); bg.addColorStop(1, "#2e2016"); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.05; ctx.fillStyle = "#000"; for (let x = 0; x < W; x += 16) ctx.fillRect(x, 0, 8, 116); ctx.globalAlpha = 1;
    const cone = ctx.createLinearGradient(W / 2, -20, W / 2, H); cone.addColorStop(0, "rgba(255,238,196,0.30)"); cone.addColorStop(0.55, "rgba(255,232,180,0.08)"); cone.addColorStop(1, "rgba(255,232,180,0)"); ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(W / 2 - 34, -10); ctx.lineTo(W / 2 + 34, -10); ctx.lineTo(W - 24, H); ctx.lineTo(24, H); ctx.closePath(); ctx.fill();
    drawTable(ctx);
    const spot = ctx.createRadialGradient(W / 2, GY - 6, 14, W / 2, GY + 6, 210); spot.addColorStop(0, "rgba(255,247,225,0.42)"); spot.addColorStop(1, "rgba(255,247,225,0)"); ctx.fillStyle = spot; ctx.fillRect(0, 80, W, H - 80);
    const vg = ctx.createRadialGradient(W / 2, GY, 70, W / 2, GY, 330); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.5)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 16; i++) { const dx = (i * 97 + t * (8 + (i % 4) * 5)) % W; const dy = 40 + ((i * 53 + Math.sin(t * 0.5 + i) * 12) % (H - 60)); ctx.fillStyle = `rgba(255,240,210,${0.05 + 0.07 * (0.5 + 0.5 * Math.sin(t * 1.3 + i))})`; ctx.beginPath(); ctx.arc(dx, dy, 1.3, 0, Math.PI * 2); ctx.fill(); }

    const shown = s.phase === "reveal" || s.phase === "result";
    const ballShell = s.shells[s.ballId];
    if (shown) { ctx.fillStyle = "#f4f0e6"; ctx.strokeStyle = "#c9bfa6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(ballShell.x, GY + 2, 14, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.beginPath(); ctx.ellipse(ballShell.x - 4, GY - 2, 4, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    [...s.shells].sort((a, b) => b.x - a.x).forEach((sh) => {
      const lifted = (s.phase === "reveal") || (s.phase === "result" && (sh === ballShell || s.shells[s.picked] === sh));
      drawShell(ctx, sh.x, lifted ? s.lift * 66 : 0);
    });
  }

  useRafLoop((dt) => {
    const s = st.current, f = dt / 1000, n = rr.current.round;
    if (s.phase === "reveal") { s.timer += f; s.lift = Math.min(1, s.timer / 0.4); if (s.timer > 1.5) { s.phase = "shuffle"; s.lift = 0; } }
    else if (s.phase === "shuffle") {
      if (s.active) {
        const k = Math.min(0.42, 0.16 + n * 0.02); // 从慢开始，逐轮加速
        s.active.a.x += (SLOTX[s.active.a.slot] - s.active.a.x) * k; s.active.b.x += (SLOTX[s.active.b.slot] - s.active.b.x) * k;
        if (Math.abs(s.active.a.x - SLOTX[s.active.a.slot]) < 1 && Math.abs(s.active.b.x - SLOTX[s.active.b.slot]) < 1) { s.active.a.x = SLOTX[s.active.a.slot]; s.active.b.x = SLOTX[s.active.b.slot]; s.active = null; s.gap = 0; }
      } else if (s.swapsLeft > 0) {
        s.gap += f;
        if (s.gap > Math.max(0.14, 0.5 - n * 0.035)) { let a = Math.floor(Math.random() * 3), b = Math.floor(Math.random() * 3); while (b === a) b = Math.floor(Math.random() * 3); const sa = s.shells.find((x) => x.slot === a)!, sb = s.shells.find((x) => x.slot === b)!; sa.slot = b; sb.slot = a; s.active = { a: sa, b: sb }; s.swapsLeft--; }
      } else { s.phase = "guess"; setMsg("小球在哪个椰子壳下？点一下"); }
    } else if (s.phase === "result") {
      s.timer += f; s.lift = Math.min(1, s.timer / 0.4);
      if (s.timer > 1.2) { if (s.correct) { const m = n + 1; setRound(m); startRound(m); setMsg("猜对了！记住新的位置"); } else { s.phase = "over"; setOver(true); setMsg(`猜错啦～共坚持了 ${n} 轮`); } }
    }
    render();
  }, true, canvasRef);
  useEffect(() => { render(); });

  function click(e: React.MouseEvent<HTMLCanvasElement>) {
    const s = st.current; if (s.phase !== "guess") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let slot = 0; for (let i = 1; i < 3; i++) if (Math.abs(x - SLOTX[i]) < Math.abs(x - SLOTX[slot])) slot = i;
    s.picked = s.shells.findIndex((sh) => sh.slot === slot); s.correct = s.picked === s.ballId; s.phase = "result"; s.timer = 0; s.lift = 0;
    setMsg(s.correct ? "对！" : "错！");
  }
  function restart() { setRound(0); setOver(false); rr.current = { round: 0 }; startRound(0); setMsg("记住小球在哪个椰子壳下"); }

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} onClick={click} className="w-full cursor-pointer rounded-2xl border border-border" />
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">连对 <b className="num">{round}</b> 轮</div>
        <span className="text-sm text-muted-foreground">{msg}</span>
        {over && <Button size="sm" className="ml-auto" onClick={restart}>再来一局</Button>}
      </div>
      <p className="text-xs text-muted-foreground">盯紧小球所在的椰子壳，洗牌结束后点它。<b>从简单开始</b>——交换次数和速度会一轮轮慢慢增加。猜对进下一轮，猜错结束，看你能连对几轮！</p>
    </div>
  );
}

// 圆木桌(3/4 俯视椭圆：厚度 + 年轮 + 径向木纹 + 高光 + 描边)
function drawTable(ctx: CanvasRenderingContext2D) {
  const cx = W / 2, cy = GY + 22, rx = 190, ry = 62;
  ctx.fillStyle = "#3f2814"; ctx.beginPath(); ctx.ellipse(cx, cy + 16, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  const wg = ctx.createRadialGradient(cx - 44, cy - 18, 14, cx, cy, rx); wg.addColorStop(0, "#cfa976"); wg.addColorStop(0.55, "#ac7d43"); wg.addColorStop(1, "#7f5528"); ctx.fillStyle = wg; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
  ctx.strokeStyle = "rgba(88,54,22,0.30)"; ctx.lineWidth = 1.5; for (let i = 1; i <= 10; i++) { const f = i / 10; ctx.beginPath(); ctx.ellipse(cx - 22, cy - 6, rx * f * 0.92, ry * f * 0.92, 0.12, 0, Math.PI * 2); ctx.stroke(); }
  ctx.strokeStyle = "rgba(70,42,16,0.14)"; ctx.lineWidth = 1; for (let a = 0; a < 14; a++) { const ang = a / 14 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx - 22, cy - 6); ctx.lineTo(cx - 22 + Math.cos(ang) * rx, cy - 6 + Math.sin(ang) * ry); ctx.stroke(); }
  const hl = ctx.createLinearGradient(cx, cy - ry, cx, cy + 6); hl.addColorStop(0, "rgba(255,242,214,0.32)"); hl.addColorStop(1, "rgba(255,242,214,0)"); ctx.fillStyle = hl; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry);
  ctx.restore();
  ctx.strokeStyle = "rgba(56,34,12,0.7)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "rgba(255,228,184,0.3)"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(cx, cy - 1, rx - 2, ry - 2, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
}
