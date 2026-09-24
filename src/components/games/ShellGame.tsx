"use client";
import { useEffect, useRef, useState } from "react";
import { fitCanvas, useRafLoop } from "@/components/demos/canvas";
import { Button } from "@/components/ui/button";

const W = 520, H = 210, SLOTX = [140, 260, 380], GY = 150, R = 44;
type Shell = { slot: number; x: number };

export function ShellGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [msg, setMsg] = useState("记住小球在哪个椰子壳下");
  const [over, setOver] = useState(false);
  const rr = useRef({ round: 0, over: false }); rr.current = { round, over };
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
    s.swapsLeft = 3 + n; s.active = null; s.gap = 0;
  }

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const s = st.current;
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#e3ebf6"; ctx.fillRect(0, GY + 6, W, 8); // 台面
    const shownBall = s.phase === "reveal" || (s.phase === "result");
    // 先画球（被壳盖住时看不见）
    const ballShell = s.shells[s.ballId];
    if (shownBall) { ctx.fillStyle = "#f4f0e6"; ctx.strokeStyle = "#c9bfa6"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ballShell.x, GY - 6, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // 椰子壳（从右到左画，避免重叠遮挡感）
    [...s.shells].sort((a, b) => b.x - a.x).forEach((sh) => {
      const lifted = (s.phase === "reveal") || (s.phase === "result" && (sh === ballShell || s.shells[s.picked] === sh));
      const yoff = lifted ? -s.lift * 46 : 0;
      const y = GY + yoff;
      ctx.fillStyle = "#7a4a22"; ctx.beginPath(); ctx.arc(sh.x, y, R, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#5c3616"; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = "#8f5a2c"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sh.x, y, R - 8, Math.PI, 0); ctx.stroke();
      ctx.beginPath(); ctx.arc(sh.x, y, R - 18, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = "#4a2c10"; [-10, 0, 10].forEach((dx) => { ctx.beginPath(); ctx.arc(sh.x + dx, y - R + 12, 2.4, 0, Math.PI * 2); ctx.fill(); });
    });
  }

  useRafLoop((dt) => {
    const s = st.current, f = dt / 1000;
    if (s.phase === "reveal") {
      s.timer += f; s.lift = Math.min(1, s.timer / 0.35);
      if (s.timer > 1.3) { s.phase = "shuffle"; s.lift = 0; }
    } else if (s.phase === "shuffle") {
      const spd = 0.14 + rr.current.round * 0.015;
      if (s.active) {
        s.active.a.x += (SLOTX[s.active.a.slot] - s.active.a.x) * Math.min(0.5, spd + 0.15);
        s.active.b.x += (SLOTX[s.active.b.slot] - s.active.b.x) * Math.min(0.5, spd + 0.15);
        if (Math.abs(s.active.a.x - SLOTX[s.active.a.slot]) < 1 && Math.abs(s.active.b.x - SLOTX[s.active.b.slot]) < 1) { s.active.a.x = SLOTX[s.active.a.slot]; s.active.b.x = SLOTX[s.active.b.slot]; s.active = null; s.gap = 0; }
      } else if (s.swapsLeft > 0) {
        s.gap += f;
        if (s.gap > Math.max(0.05, 0.25 - rr.current.round * 0.02)) {
          let a = Math.floor(Math.random() * 3), b = Math.floor(Math.random() * 3); while (b === a) b = Math.floor(Math.random() * 3);
          const sa = s.shells.find((x) => x.slot === a)!, sb = s.shells.find((x) => x.slot === b)!;
          sa.slot = b; sb.slot = a; s.active = { a: sa, b: sb }; s.swapsLeft--;
        }
      } else { s.phase = "guess"; setMsg("小球在哪个椰子壳下？点一下"); }
    } else if (s.phase === "result") {
      s.timer += f; s.lift = Math.min(1, s.timer / 0.35);
      if (s.timer > 1.2) {
        if (s.correct) { const n = rr.current.round + 1; setRound(n); startRound(n); setMsg("猜对了！记住新的位置"); }
        else { s.phase = "over"; setOver(true); setMsg(`猜错啦～共坚持了 ${rr.current.round} 轮`); }
      }
    }
    render();
  }, true, canvasRef);
  useEffect(() => { render(); });

  function click(e: React.MouseEvent<HTMLCanvasElement>) {
    const s = st.current; if (s.phase !== "guess") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let slot = 0; for (let i = 1; i < 3; i++) if (Math.abs(x - SLOTX[i]) < Math.abs(x - SLOTX[slot])) slot = i;
    s.picked = s.shells.findIndex((sh) => sh.slot === slot);
    s.correct = s.picked === s.ballId; s.phase = "result"; s.timer = 0; s.lift = 0;
    setMsg(s.correct ? "对！" : "错！");
  }

  function restart() { setRound(0); setOver(false); rr.current = { round: 0, over: false }; startRound(0); setMsg("记住小球在哪个椰子壳下"); }

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} onClick={click} className="w-full cursor-pointer rounded-2xl border border-border" />
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">连对 <b className="num">{round}</b> 轮</div>
        <span className="text-sm text-muted-foreground">{msg}</span>
        {over && <Button size="sm" className="ml-auto" onClick={restart}>再来一局</Button>}
      </div>
      <p className="text-xs text-muted-foreground">盯紧小球所在的椰子壳，洗牌结束后点它。猜对进入下一轮，交换<b>更多、更快</b>；猜错就结束。看你能连对几轮！</p>
    </div>
  );
}
