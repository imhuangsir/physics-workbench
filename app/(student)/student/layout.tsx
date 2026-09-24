"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ClipboardList, BookMarked, Sparkles, BarChart3, FlaskConical } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSession, clearSession } from "@/lib/client/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/student", label: "作业", icon: ClipboardList },
  { href: "/student/demos", label: "物理演示", icon: FlaskConical },
  { href: "/student/report", label: "学习报告", icon: BarChart3 },
  { href: "/student/wrong-questions", label: "错题本", icon: BookMarked },
  { href: "/student/assistant", label: "AI 助手", icon: Sparkles },
];

export default function StudentLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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

  function isActive(href: string) {
    return href === "/student" ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <span className="font-semibold">我的作业{name ? ` · ${name}` : ""}</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" aria-label="退出登录" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-3 pb-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href}
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(n.href) ? "soft-violet" : "text-muted-foreground hover:bg-secondary")}>
                <Icon className="h-4 w-4" />{n.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
