import { and, eq, sql } from "drizzle-orm";
import type { DB } from "@/db/client";
import { gameScores, students } from "@/db/schema";

// 允许上榜的小游戏 key（白名单，避免任意写入）
const GAMES = new Set(["gravity-run"]);
export function isGameKey(g: unknown): g is string {
  return typeof g === "string" && GAMES.has(g);
}

async function classIdOf(db: DB, studentId: number): Promise<number> {
  const r = await db.select({ c: students.classId }).from(students).where(eq(students.id, studentId)).get();
  return r?.c ?? 0;
}

async function classBestOf(db: DB, classId: number, game: string): Promise<number> {
  if (!classId) return 0;
  const r = await db.select({ m: sql<number>`max(${gameScores.best})` }).from(gameScores)
    .where(and(eq(gameScores.classId, classId), eq(gameScores.game, game))).get();
  return r?.m ?? 0;
}

export interface Scores { best: number; classBest: number }

/** 读取该学生在某游戏的历史最高分，以及其所在班级的全班最高分。 */
export async function getScores(db: DB, studentId: number, game: string): Promise<Scores> {
  const classId = await classIdOf(db, studentId);
  const mine = await db.select({ b: gameScores.best }).from(gameScores)
    .where(and(eq(gameScores.studentId, studentId), eq(gameScores.game, game))).get();
  return { best: mine?.b ?? 0, classBest: await classBestOf(db, classId, game) };
}

/** 提交一局分数：仅在超过历史最高时更新，返回最新的个人/全班最高。 */
export async function submitScore(db: DB, studentId: number, game: string, score: number): Promise<Scores> {
  const sc = Math.max(0, Math.min(1_000_000, Math.floor(score || 0)));
  const classId = await classIdOf(db, studentId);
  const now = Math.floor(Date.now() / 1000);
  await db.insert(gameScores).values({ studentId, classId, game, best: sc, updatedAt: now })
    .onConflictDoUpdate({
      target: [gameScores.studentId, gameScores.game],
      // SQLite UPSERT：set 子句里的列名指向已存在的行，取历史与本局的较大值
      set: { best: sql`max(${gameScores.best}, ${sc})`, classId, updatedAt: now },
    });
  return getScores(db, studentId, game);
}
