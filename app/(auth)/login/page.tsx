"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { getSession, saveSession, type Session } from "@/lib/client/auth";
import { FadeIn } from "@/components/motion/fade-in";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Cls = { id: number; name: string };
type Tab = "student" | "teacher";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("student");
  const [classes, setClasses] = useState<Cls[]>([]);
  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 已登录则按角色自动跳转
  useEffect(() => {
    const s = getSession();
    if (s?.role === "student") router.replace("/student");
    else if (s?.role === "teacher") router.replace("/teacher");
  }, [router]);

  // 学生 Tab：拉取班级
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

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <FadeIn>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl font-extrabold tracking-tight">八年级物理练习工作台</CardTitle>
            <CardDescription>请选择身份登录</CardDescription>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
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
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </FadeIn>
    </main>
  );
}
