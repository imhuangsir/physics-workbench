"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut } from "lucide-react";
import { getSession, clearSession } from "@/lib/client/auth";
import { Button } from "@/components/ui/button";

export default function StudentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    const s = getSession();
    if (s?.role !== "student") { router.replace("/login"); return; }
    setName(s.student?.name ?? "");
    setReady(true);
  }, [router]);

  if (!ready) return null;

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-semibold">我的作业{name ? ` · ${name}` : ""}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="切换主题"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Sun className="h-5 w-5 dark:hidden" />
              <Moon className="hidden h-5 w-5 dark:block" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="退出登录" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container py-6">{children}</main>
    </div>
  );
}
