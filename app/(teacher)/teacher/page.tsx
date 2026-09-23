"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/client/fetcher";
import { FadeIn } from "@/components/motion/fade-in";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

type ClassRow = { id: number; name: string; count: number };
type Assignment = { id: number; title: string };

export default function TeacherHome() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    api<ClassRow[]>("/api/teacher/classes").then(setClasses).catch((e) => toast.error(e instanceof Error ? e.message : "加载失败"));
    api<Assignment[]>("/api/teacher/assignments").then(setAssignments).catch(() => {});
  }, []);

  const totalStudents = classes.reduce((a, c) => a + Number(c.count ?? 0), 0);

  const tiles = [
    { href: "/teacher/roster", title: "班级 / 名单", desc: `${classes.length} 个班级 · ${totalStudents} 名学生` },
    { href: "/teacher/questions", title: "题库", desc: "创建与管理题目" },
    { href: "/teacher/assignments", title: "作业", desc: `${assignments.length} 个作业` },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((t, i) => (
        <FadeIn key={t.href} delay={i * 0.05}>
          <Link href={t.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>{t.title}</CardTitle>
                <CardDescription>{t.desc}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-primary">进入 →</CardContent>
            </Card>
          </Link>
        </FadeIn>
      ))}
    </div>
  );
}
