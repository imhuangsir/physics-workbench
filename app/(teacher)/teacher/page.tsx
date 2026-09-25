"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Users, GraduationCap, ClipboardList, Library } from "lucide-react";
import { api } from "@/lib/client/fetcher";
import { FadeIn } from "@/components/motion/fade-in";
import { SectionLabel } from "@/components/ui/bento";

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
    { href: "/teacher/roster", cls: "soft-violet", k: "班级", v: classes.length, cap: "个教学班", Icon: Users },
    { href: "/teacher/roster", cls: "soft-emerald", k: "学生", v: totalStudents, cap: "名在册", Icon: GraduationCap },
    { href: "/teacher/assignments", cls: "soft-blue", k: "作业", v: assignments.length, cap: "份 · 点击查看", Icon: ClipboardList },
    { href: "/teacher/questions", cls: "tile-dark", k: "题库", v: "→", cap: "创建与管理题目", Icon: Library },
  ];

  return (
    <div className="space-y-6">
      <SectionLabel>老师概览 · Bento 栅格</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <FadeIn>
          <Link href="/teacher/assignments"
            className="grad-violet flex min-h-[172px] flex-col justify-between rounded-3xl p-6 shadow-soft transition hover:opacity-95 sm:col-span-2 sm:row-span-2 md:min-h-full">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">八年级物理 · 老师后台</h2>
              <p className="mt-1.5 text-sm text-white/90">建班 · 名单 · 题库 · 作业 · 统计，一处掌握</p>
            </div>
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold">
              新建作业 <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </FadeIn>
        {tiles.map((t, i) => (
          <FadeIn key={t.k} delay={(i + 1) * 0.04}>
            <Link href={t.href}
              className={`relative flex min-h-[132px] flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-soft transition hover:opacity-95 ${t.cls}`}>
              <t.Icon className="pointer-events-none absolute -bottom-4 -right-3 h-24 w-24 opacity-15" />
              <div className="relative text-sm font-semibold opacity-90">{t.k}</div>
              <div className="relative">
                <div className="num text-4xl font-extrabold leading-none tracking-tight">{t.v}</div>
                <div className="mt-1 text-sm opacity-90">{t.cap}</div>
              </div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
