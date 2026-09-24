"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

/** 按设备像素比放大画布缓冲，返回以逻辑像素(w×h)为坐标系的 2D 上下文；CSS 自适应缩放，桌面端可放大到 720px 且保持清晰。 */
export function fitCanvas(canvas: HTMLCanvasElement, w: number, h: number): CanvasRenderingContext2D {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = "100%";
  canvas.style.maxWidth = "720px";
  canvas.style.height = "auto";
  canvas.style.display = "block";
  canvas.style.marginInline = "auto";
  const cssW = Math.min(canvas.clientWidth || w, 760);
  const bw = Math.max(1, Math.round(cssW * dpr));
  const bh = Math.max(1, Math.round(bw * h / w));
  if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  const ctx = canvas.getContext("2d")!;
  const s = bw / w; // 逻辑坐标 0..w 映射到整个缓冲宽度
  ctx.setTransform(s, 0, 0, s, 0, 0);
  return ctx;
}

/** requestAnimationFrame 循环；playing=false 时停止。传入 elRef 后，元素滚出视口时自动暂停(省电/避免离屏动画白跑)。回调收到 (dtMs, tMs)。 */
export function useRafLoop(cb: (dtMs: number, tMs: number) => void, playing: boolean, elRef?: RefObject<HTMLElement | null>) {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = elRef?.current;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return; }
    const io = new IntersectionObserver((es) => setInView(es[0]?.isIntersecting ?? true), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, [elRef]);
  useEffect(() => {
    if (!playing || !inView) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 64); // 夹住卡顿时的大步长
      last = now;
      cbRef.current(dt, now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, inView]);
}

/** 画布配色（自带背景，独立于明暗主题，作为"插图"呈现）。 */
export const C = {
  sky: "#eef4ff", ground: "#dfe7f3", grid: "#c9d4e6", axis: "#8a93a8",
  ink: "#1f2740", muted: "#5b6480",
  violet: "#8b5cf6", blue: "#3b82f6", emerald: "#10b981", amber: "#f59e0b", rose: "#f43f5e",
};
