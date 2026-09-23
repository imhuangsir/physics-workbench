"use client";
import { useEffect, useState } from "react";

/**
 * 计时器：把开始时间存在 localStorage，切后台/刷新都不丢。
 * 注意：localStorage 只在 useEffect 里访问，避免 SSR/预渲染阶段 ReferenceError。
 */
export function useTimer(assignmentId: number) {
  const key = `pw_timer_${assignmentId}`;
  const [start, setStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    const s = saved ? Number(saved) : Date.now();
    if (!saved) localStorage.setItem(key, String(s));
    setStart(s);
    setElapsed(Math.floor((Date.now() - s) / 1000));
  }, [key]);

  useEffect(() => {
    if (start == null) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [start]);

  const clear = () => localStorage.removeItem(key);
  return { elapsed, clear };
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
