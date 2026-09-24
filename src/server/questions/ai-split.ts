import type { AppEnv } from "@/lib/env";
import { aiConfig, chat, parseJsonLoose } from "@/lib/ai/provider";
import type { DraftType } from "@/lib/ocr/split";

export interface AiDraft {
  type: DraftType;
  stem: string;
  options: string[]; // 选项文本（不含 "A." 前缀），非选择题为 []
  answer: string | string[] | null; // single:"B" | multi:["A","C"] | fill:["答案"] | short:null
  analysis?: string;
}

const SYSTEM = `你是初中物理老师的助教。把给定的试卷/题目文本切分成一道道题目，并判断题型。
只输出 JSON，格式：{"questions":[{"type":"single","stem":"...","options":["...","..."],"answer":"B","analysis":"..."}]}
规则：
- type 取值：single(单选) / multi(多选) / fill(填空) / short(简答或计算题)。
- stem 是题干（去掉题号和选项文字）。options 是选项文本数组（不含 "A." 这类前缀）；非选择题 options 为 []。
- answer：单选填字母如 "B"；多选填字母数组如 ["A","C"]；填空填答案数组如 ["0.5"]；简答填 null。原文若没有给答案就填 null。
- analysis 可选，填解析或评分要点。
- 忠实还原题目原文，不要杜撰题目内容。只返回 JSON，不要任何多余说明。`;

/** 用 AI 把整段文本切分成结构化草稿题（含题型与可能的答案）。 */
export async function aiSplit(env: AppEnv, text: string): Promise<AiDraft[]> {
  const cfg = aiConfig(env);
  const out = await chat(cfg, {
    system: SYSTEM,
    messages: [{ role: "user", content: text.slice(0, 12000) }],
    maxTokens: 4096,
    temperature: 0.2,
  });
  const parsed = parseJsonLoose<{ questions?: AiDraft[] }>(out);
  const arr = Array.isArray(parsed?.questions) ? parsed!.questions! : [];
  const types = ["single", "multi", "fill", "short"];
  return arr
    .filter((q) => q && typeof q.stem === "string" && q.stem.trim())
    .map((q) => ({
      type: (types.includes(q.type) ? q.type : "short") as DraftType,
      stem: q.stem.trim(),
      options: Array.isArray(q.options) ? q.options.map((o) => String(o).trim()).filter(Boolean) : [],
      answer: q.answer ?? null,
      analysis: typeof q.analysis === "string" ? q.analysis : undefined,
    }));
}
