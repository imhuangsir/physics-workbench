"use client";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { fitCanvas, useRafLoop, C } from "./canvas";
import { Button } from "@/components/ui/button";

const W = 560, H = 200, CY = 104, X0 = 24, X1 = W - 24, CYCLES = 3, FREQ = 320;
const TIMBRES = [
  { name: "音叉", harm: [0, 1] },
  { name: "钢琴", harm: [0, 1, 0.6, 0.4, 0.28, 0.18, 0.12] },
  { name: "长笛", harm: [0, 1, 0.18, 0.08, 0.03] },
];
const waveVal = (harm: number[], th: number) => { let s = 0; for (let k = 1; k < harm.length; k++) s += harm[k] * Math.sin(k * th); return s; };
const peakOf = (harm: number[]) => { let m = 0; for (let i = 0; i < 256; i++) { const v = Math.abs(waveVal(harm, (i / 256) * 2 * Math.PI)); if (v > m) m = v; } return m || 1; };

export function TimbreDemo() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sel, setSel] = useState(0);
  const sr = useRef(0); sr.current = sel;
  const p = useRef(0);
  const audio = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode } | null>(null);
  const [sound, setSound] = useState(false);

  function render() {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = fitCanvas(cv, W, H);
    const harm = TIMBRES[sr.current].harm, pk = peakOf(harm);
    ctx.fillStyle = "#f7f9fc"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#dbe3ef"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X0, CY); ctx.lineTo(X1, CY); ctx.stroke();
    ctx.strokeStyle = C.violet; ctx.lineWidth = 3; ctx.beginPath();
    for (let x = X0; x <= X1; x++) {
      const th = ((x - X0) / (X1 - X0)) * CYCLES * 2 * Math.PI + p.current;
      const y = CY - (waveVal(harm, th) / pk) * 62;
      x === X0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = C.ink; ctx.font = "700 13px system-ui"; ctx.fillText(`${TIMBRES[sr.current].name}：音调、响度相同，波形（音色）不同`, X0, 24);
  }

  useRafLoop((dt) => { p.current += (dt / 1000) * 3; render(); }, !reduce);
  useEffect(() => { render(); });
  useEffect(() => () => { try { audio.current?.osc.stop(); audio.current?.ctx.close(); } catch { /* noop */ } }, []);

  function stop() { try { audio.current?.osc.stop(); audio.current?.ctx.close(); } catch { /* noop */ } audio.current = null; setSound(false); }
  function play(i: number) {
    stop();
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      const harm = TIMBRES[i].harm, imag = new Float32Array(harm), real = new Float32Array(harm.length);
      osc.setPeriodicWave(ctx.createPeriodicWave(real, imag, { disableNormalization: false }));
      osc.frequency.value = FREQ; gain.gain.value = 0.16;
      osc.connect(gain); gain.connect(ctx.destination); osc.start();
      audio.current = { ctx, osc, gain }; setSound(true);
    } catch { /* 不支持则仅看波形 */ }
  }

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="rounded-2xl border border-border" />
      <div className="flex flex-wrap gap-2">
        {TIMBRES.map((t, i) => (
          <Button key={t.name} size="sm" variant={i === sel ? "default" : "outline"}
            onClick={() => { setSel(i); if (sound || audio.current) play(i); }}>{t.name}</Button>
        ))}
        <Button size="sm" variant="outline" onClick={() => (sound ? stop() : play(sel))}>{sound ? "⏸ 停止" : "▶ 播放（听音色）"}</Button>
      </div>
      <p className="text-xs text-muted-foreground">三种乐器发出<b>相同音调、相同响度</b>的音，但<b>波形不同</b>——这就是<b>音色</b>。音色由发声体的材料和结构决定，我们靠音色分辨不同乐器和人声。点播放，切换乐器听区别。</p>
    </div>
  );
}
