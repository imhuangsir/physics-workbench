"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Dir = "L" | "R" | "U" | "D";
const COLORS: Record<number, string> = {
  2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563", 32: "#f67c5f", 64: "#f65e3b",
  128: "#edcf72", 256: "#edcc61", 512: "#edc850", 1024: "#edc53f", 2048: "#edc22e",
};
const rnd = (n: number) => Math.floor(Math.random() * n);

function spawn(g: number[]): number[] {
  const empty = g.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0);
  if (!empty.length) return g;
  const ng = [...g]; ng[empty[rnd(empty.length)]] = Math.random() < 0.9 ? 2 : 4; return ng;
}
function line(arr: number[]): { row: number[]; gain: number } {
  const a = arr.filter((x) => x); let gain = 0;
  for (let i = 0; i < a.length - 1; i++) if (a[i] === a[i + 1]) { a[i] *= 2; gain += a[i]; a.splice(i + 1, 1); }
  while (a.length < 4) a.push(0);
  return { row: a, gain };
}
function move(g: number[], dir: Dir): { g: number[]; gain: number; moved: boolean } {
  const ng = new Array(16).fill(0); let gain = 0;
  for (let i = 0; i < 4; i++) {
    let idx: number[];
    if (dir === "L") idx = [0, 1, 2, 3].map((j) => i * 4 + j);
    else if (dir === "R") idx = [3, 2, 1, 0].map((j) => i * 4 + j);
    else if (dir === "U") idx = [0, 1, 2, 3].map((j) => j * 4 + i);
    else idx = [3, 2, 1, 0].map((j) => j * 4 + i);
    const { row, gain: gn } = line(idx.map((k) => g[k])); gain += gn;
    idx.forEach((k, j) => (ng[k] = row[j]));
  }
  return { g: ng, gain, moved: ng.some((v, i) => v !== g[i]) };
}
const canMove = (g: number[]) => (["L", "R", "U", "D"] as Dir[]).some((d) => move(g, d).moved);

export function Game2048() {
  const [grid, setGrid] = useState<number[]>(() => spawn(spawn(new Array(16).fill(0))));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [over, setOver] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const doMove = useCallback((dir: Dir) => {
    setGrid((g) => {
      if (over) return g;
      const r = move(g, dir);
      if (!r.moved) return g;
      const ng = spawn(r.g);
      setScore((s) => { const ns = s + r.gain; setBest((b) => Math.max(b, ns)); return ns; });
      if (!canMove(ng)) setOver(true);
      return ng;
    });
  }, [over]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const m: Record<string, Dir> = { ArrowLeft: "L", ArrowRight: "R", ArrowUp: "U", ArrowDown: "D" };
      if (m[e.key]) { e.preventDefault(); doMove(m[e.key]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doMove]);

  function restart() { setGrid(spawn(spawn(new Array(16).fill(0)))); setScore(0); setOver(false); }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">分数 <b className="num">{score}</b></div>
        <div className="rounded-xl bg-muted px-3 py-1.5 text-sm">最高 <b className="num">{best}</b></div>
        <Button size="sm" variant="outline" className="ml-auto" onClick={restart}>重开</Button>
      </div>
      <div
        className="relative mx-auto grid aspect-square w-full max-w-[360px] grid-cols-4 gap-2 rounded-2xl bg-[#bbada0] p-2 touch-none select-none"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y;
          if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "R" : "L") : (dy > 0 ? "D" : "U"));
          touch.current = null;
        }}
      >
        {grid.map((v, i) => (
          <div key={i} className="flex aspect-square items-center justify-center rounded-lg text-2xl font-extrabold"
            style={{ background: v ? COLORS[v] ?? "#3c3a32" : "rgba(238,228,218,0.35)", color: v <= 4 ? "#776e65" : "#f9f6f2" }}>
            {v || ""}
          </div>
        ))}
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl bg-background/80">
            <p className="text-lg font-bold">游戏结束 · {score} 分</p>
            <Button size="sm" onClick={restart}>再来一局</Button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">方向键（手机上滑动）移动方块，相同数字相撞就合并。每步随机冒出新数字，格子填满且无法合并就结束。目标 2048！</p>
    </div>
  );
}
