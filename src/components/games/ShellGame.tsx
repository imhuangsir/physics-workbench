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
    // 背景墙 + 桌面 + 木纹 + 聚光
    const wall = ctx.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, "#f6eede"); wall.addColorStop(1, "#e6d8bd");
    ctx.fillStyle = wall; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c9a97a"; ctx.beginPath(); ctx.moveTo(64, 96); ctx.lineTo(W - 64, 96); ctx.lineTo(W - 14, H - 14); ctx.lineTo(14, H - 14); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(110,72,36,0.16)"; ctx.lineWidth = 1.5; for (let i = 1; i < 6; i++) { const t = i / 6; ctx.beginPath(); ctx.moveTo(64 + (14 - 64) * t, 96 + (H - 14 - 96) * t); ctx.lineTo(W - 64 + (W - 14 - (W - 64)) * t, 96 + (H - 14 - 96) * t); ctx.stroke(); }
    ctx.fillStyle = "#bd9b68"; ctx.beginPath(); ctx.ellipse(W / 2, 96, (W - 128) / 2, 11, 0, 0, Math.PI * 2); ctx.fill();
    const spot = ctx.createRadialGradient(W / 2, GY - 10, 20, W / 2, GY - 10, 230); spot.addColorStop(0, "rgba(255,250,235,0.45)"); spot.addColorStop(1, "rgba(255,250,235,0)"); ctx.fillStyle = spot; ctx.fillRect(0, 60, W, H - 60);

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
