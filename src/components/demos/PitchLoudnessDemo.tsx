"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 200, CY = 116, X0 = 24, X1 = W - 24;
const hz = (f: number) => 180 + f * 90;

export function PitchLoudnessDemo() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [freq, setFreq] = useState(3);
  const [amp, setAmp] = useState(0.7);
  const p = useRef(0);
  const fr = useRef(3); fr.current = freq;
  const ar = useRef(0.7); ar.current = amp;
  const audio = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(null);
  const [sound, setSound] = useState(false);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#dbe3ef"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X0, CY); ctx.lineTo(X1, CY); ctx.stroke();
    ctx.strokeStyle = C.violet; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = X0; x <= X1; x++) {
      const y = CY - ar.current * 62 * Math.sin((2 * Math.PI * fr.current * (x - X0)) / (X1 - X0) + p.current);
      x === X0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui";
    ctx.fillText(`音调（频率）：${fr.current <= 2 ? "低" : fr.current >= 6 ? "高" : "中"}  越密越高`, X0, 24);
    ctx.fillText(`响度（振幅）：${ar.current < 0.4 ? "小" : ar.current > 0.8 ? "大" : "中"}  越高越响`, X0, 44);
  }

  useRafLoop((dt) => { p.current += dt / 1000 * 3; render(); }, !reduce, canvasRef);
  useEffect(() => { render(); });

  // 播放时随滑块实时更新音高/音量
  useEffect(() => { if (audio.current) { audio.current.osc.frequency.value = hz(freq); audio.current.gain.gain.value = amp * 0.14; } }, [freq, amp]);
  useEffect(() => () => { try { audio.current?.osc.stop(); audio.current?.ctx.close(); } catch { /* noop */ } }, []);

  function toggleSound() {
    if (sound) { try { audio.current?.osc.stop(); audio.current?.ctx.close(); } catch { /* noop */ } audio.current = null; setSound(false); return; }
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = hz(freq); gain.gain.value = amp * 0.14;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      audio.current = { ctx, osc, gain }; setSound(true);
    } catch { /* 浏览器不支持则仅看波形 */ }
  }

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="space-y-2">
        <div className="flex items-center gap-3"><span className="w-20 text-sm text-muted-foreground">音调</span>
          <input type="range" min={1} max={8} step={1} value={freq} onChange={(e) => setFreq(Number(e.target.value))} className="flex-1" />
          <span className="w-12 text-xs text-muted-foreground">{hz(freq)}Hz</span></div>
        <div className="flex items-center gap-3"><span className="w-20 text-sm text-muted-foreground">响度</span>
          <input type="range" min={0.15} max={1} step={0.05} value={amp} onChange={(e) => setAmp(Number(e.target.value))} className="flex-1" />
          <span className="w-12" /></div>
      </div>
      <Button size="sm" onClick={toggleSound}>{sound ? "⏸ 停止声音" : "▶ 播放声音（可听）"}</Button>
      <p className="text-xs text-muted-foreground"><b>音调</b>由频率决定（振动越快、波形越密、听起来越高）；<b>响度</b>由振幅决定（振动幅度越大、波形越高、听起来越响）。拖滑块并点"播放"，边看边听。</p>
    </div>
  );
}
