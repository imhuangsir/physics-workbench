"use client";
import { useEffect, useState } from "react";
import { fetchImageUrl } from "@/lib/client/fetcher";

/** 带鉴权展示 R2 图片：拉 blob → object URL（<img> 无法带 Authorization 头，故走此组件）。 */
export function AuthImage({ imageKey, className }: { imageKey: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let created: string | null = null;
    fetchImageUrl(imageKey)
      .then((u) => { created = u; if (alive) setUrl(u); })
      .catch(() => { if (alive) setUrl(null); });
    return () => { alive = false; if (created) URL.revokeObjectURL(created); };
  }, [imageKey]);

  if (!url) return <div className={`flex items-center justify-center bg-secondary text-xs text-muted-foreground ${className ?? ""}`}>图片加载中…</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="订正图片" className={className} />;
}
