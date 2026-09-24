"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical, Timer, Sparkles, BookMarked } from "lucide-react";
import { api } from "@/lib/client/fetcher";
import { getSession, saveSession, type Session } from "@/lib/client/auth";
import { FadeIn } from "@/components/motion/fade-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Cls = { id: number; name: string };
type Tab = "student" | "teacher";

const FEATURES = [
  { icon: Timer, text: "计时答题 · 客观题即时判分" },
  { icon: Sparkles, text: "AI 简答批改 + 物理学习助手" },
  { icon: BookMarked, text: "错题本 · 订正 · 学习报告" },
];

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("student");
  const [classes, setClasses] = useState<Cls[]>([]);
  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s?.role === "student") router.replace("/student");
    else if (s?.role === "teacher") router.replace("/teacher");
  }, [router]);

  useEffect(() => {
    if (tab !== "student") return;
    api<Cls[]>("/api/classes")
      .then(setClasses)
      .catch((e) => toast.error(e instanceof Error ? e.message : "加载班级失败"));
  }, [tab]);

  async function studentLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) return toast.error("请选择班级");
    if (!name.trim()) return toast.error("请输入姓名");
    setLoading(true);
    try {
      const data = await api<{ token: string; student: { id: number; name: string; classId: number } }>(
        "/api/auth/student/login",
        { method: "POST", body: JSON.stringify({ classId: Number(classId), name: name.trim() }) },
      );
      const session: Session = { token: data.token, role: "student", student: data.student };
      saveSession(session);
      toast.success(`欢迎，${data.student.name}`);
      router.replace("/student");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  async function teacherLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return toast.error("请输入密码");
    setLoading(true);
    try {
      const data = await api<{ token: string }>("/api/auth/teacher/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      saveSession({ token: data.token, role: "teacher" });
      toast.success("登录成功");
      router.replace("/teacher");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }
  // PLACEHOLDER_RENDER
  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <FadeIn>
        <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border bg-card shadow-lift md:grid-cols-2">
          {/* 品牌面板 */}
          <div className="grad-violet flex flex-col justify-between gap-8 p-8 text-white md:p-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                  <FlaskConical className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold tracking-wide text-white/90">八年级 · 物理</span>
              </div>
              <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-balance">
                物理练习工作台
              </h1>
              <p className="mt-2 text-sm text-white/90">建班 · 名单 · 题库 · 作业 · 判分 · 统计，一处搞定。</p>
            </div>
            <ul className="space-y-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.text} className="flex items-center gap-3 text-sm text-white/95">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15">
                      <Icon className="h-4 w-4" />
                    </span>
                    {f.text}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 登录表单 */}
          <div className="p-8 md:p-10">
            <h2 className="text-lg font-bold tracking-tight">欢迎回来</h2>
            <p className="mt-1 text-sm text-muted-foreground">请选择身份登录</p>
            <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
              {(["student", "teacher"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
                    (tab === t ? "bg-card shadow-soft" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  {t === "student" ? "学生" : "老师"}
                </button>
              ))}
            </div>
            {/* PLACEHOLDER_FORMS */}
            <div className="mt-5">
              {tab === "student" ? (
                <form onSubmit={studentLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="class">班级</Label>
                    <Select id="class" value={classId} onChange={(e) => setClassId(e.target.value)}>
                      <option value="">请选择班级</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="name">姓名</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入你的姓名" />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? "登录中…" : "进入我的作业"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={teacherLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="password">管理员密码</Label>
                    <Input id="password" type="password" value={password}
                      onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" />
                  </div>
                  <Button type="submit" size="lg" className="w-full" disabled={loading}>
                    {loading ? "登录中…" : "进入后台"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </FadeIn>
    </main>
  );
}
