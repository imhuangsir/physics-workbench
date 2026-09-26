import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireStudent } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { getScores, submitScore, isGameKey } from "@/server/games/scores";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
// 小游戏最高分：GET 读取个人+全班最高；POST 提交一局分数(取历史较大值)。
export async function GET(req: Request) {
  try {
    const env = cfEnv();
    const db = getDb(env.DB);
    const studentId = await requireStudent(req, { db, secret: env.AUTH_SECRET });
    const game = new URL(req.url).searchParams.get("game") ?? "";
    if (!isGameKey(game)) throw appError("validation_error", "未知的游戏");
    return ok(await getScores(db, studentId, game));
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const env = cfEnv();
    const db = getDb(env.DB);
    const studentId = await requireStudent(req, { db, secret: env.AUTH_SECRET });
    const body = await req.json().catch(() => null) as { game?: string; score?: number } | null;
    if (!body || !isGameKey(body.game)) throw appError("validation_error", "未知的游戏");
    const score = Number(body.score);
    if (!Number.isFinite(score)) throw appError("validation_error", "分数无效");
    return ok(await submitScore(db, studentId, body.game, score));
  } catch (e) { return fail(e); }
}
