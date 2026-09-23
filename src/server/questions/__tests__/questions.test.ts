import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { getDb } from "../../../db/client";
import { createQuestion, listQuestions } from "../service";

describe("createQuestion", () => {
  it("单选缺 options 报 validation_error", async () => {
    const db = getDb(env.DB);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(createQuestion(db, { type: "single", stem: "x", answer: "A" } as any))
      .rejects.toMatchObject({ code: "validation_error" });
  });
  it("单选合法则入库，answer/options 以 JSON 存", async () => {
    const db = getDb(env.DB);
    const q = await createQuestion(db, {
      type: "single", stem: "1+1=?", options: [{ key: "A", text: "1" }, { key: "B", text: "2" }],
      answer: "B", chapter: "运动", knowledgeTags: ["计算"], difficulty: 2,
    });
    expect(q.id).toBeGreaterThan(0);
    const list = await listQuestions(db, { chapter: "运动" });
    expect(list).toHaveLength(1);
    expect(list[0].answerJson).toBe(JSON.stringify("B"));
  });
  it("简答无需 answer/options", async () => {
    const db = getDb(env.DB);
    const q = await createQuestion(db, { type: "short", stem: "简述惯性", difficulty: 3 });
    expect(q.answerJson).toBeNull();
  });
});
