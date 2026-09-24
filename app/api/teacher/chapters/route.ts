import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { listChapters, createChapter } from "@/server/chapters/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
export async function GET(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    return ok(await listChapters(getDb(env.DB)));
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const body = await req.json().catch(() => null) as { name?: string } | null;
    if (!body?.name) throw appError("validation_error", "缺少章节名");
    return ok(await createChapter(getDb(env.DB), body.name), 201);
  } catch (e) { return fail(e); }
}
