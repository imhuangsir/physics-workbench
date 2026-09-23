"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut, Users, BookOpen, ClipboardList, LayoutDashboard } from "lucide-react";
import { getSession, clearSession } from "@/lib/client/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/teacher", label: "概览", icon: LayoutDashboard },
  { href: "/teacher/roster", label: "名单", icon: Users },
  { href: "/teacher/questions", label: "题库", icon: BookOpen },
  { href: "/teacher/assignments", label: "作业", icon: ClipboardList },
];

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s?.role !== "teacher") { router.replace("/login"); return; }
    setReady(true);
  }, [router]);

  if (!ready) return null;

  function isActive(href: string) {
    return href === "/teacher" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="font-semibold">物理工作台 · 老师后台</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="切换主题"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              <Sun className="h-5 w-5 dark:hidden" />
              <Moon className="hidden h-5 w-5 dark:block" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="退出登录"
              onClick={() => { clearSession(); router.replace("/login"); }}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        {/* 移动端横向导航 */}
        <nav className="flex gap-1 overflow-x-auto border-t px-2 py-1 md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm", isActive(n.href) ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex">
        {/* 桌面端左侧导航 */}
        <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-52 shrink-0 border-r p-3 md:block">
          <nav className="space-y-1">
            {NAV.map((n) => {
              const Icon = n.icon;
              return (
                <Link key={n.href} href={n.href}
                  className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", isActive(n.href) ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent")}>
                  <Icon className="h-4 w-4" />{n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
