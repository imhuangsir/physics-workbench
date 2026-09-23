import { cfEnv } from "@/lib/env";
import { getDb } from "@/db/client";
import { requireTeacher } from "@/lib/auth/guards";
import { ok, fail, appError } from "@/lib/http";
import { deleteAnnouncement } from "@/server/announcements/service";

// Node 运行时(nodejs_compat)，勿写 runtime="edge"。
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const env = cfEnv();
    await requireTeacher(req, env.AUTH_SECRET);
    const id = Number((await params).id);
    if (!id) throw appError("validation_error", "无效的公告 id");
    return ok(await deleteAnnouncement(getDb(env.DB), id));
  } catch (e) { return fail(e); }
}
