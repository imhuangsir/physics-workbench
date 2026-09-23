import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { listAllAnnouncements, createAnnouncement } from "@/server/announcements/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
export async function GET(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    return ok(await listAllAnnouncements(getDb(env.DB)));
  } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const body = await req.json().catch(() => null) as { title?: string; body?: string; classId?: number | null } | null;
    if (!body) throw appError("validation_error", "请求体无效");
    return ok(await createAnnouncement(getDb(env.DB), { title: body.title ?? "", body: body.body, classId: body.classId ?? null }), 201);
  } catch (e) { return fail(e); }
}
