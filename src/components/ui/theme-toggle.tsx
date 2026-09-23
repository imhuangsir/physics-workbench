"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/** 浅色 / 深色 药丸切换（挂载后才反映当前主题，避免 SSR 水合不一致）*/
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className="inline-flex gap-0.5 rounded-full border border-border bg-secondary p-0.5" role="group" aria-label="主题">
      {([["light", "浅色"], ["dark", "深色"]] as const).map(([val, label]) => {
        const active = mounted && (val === "dark" ? isDark : !isDark);
        return (
          <button
            key={val}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(val)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
              active ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
