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

export interface FilledAnswer { answer: string | string[] | null; analysis?: string }

const FILL_SYSTEM = `你是初中物理老师的助教。下面给你一份题目列表(按序号)和一份参考答案文本，请把答案对应到每一道题。
只输出 JSON：{"answers":[{"answer":...,"analysis":"..."}]}，数组长度和顺序必须与题目完全一致。
- 单选：answer 填字母如 "B"；多选：填字母数组如 ["A","C"]；填空：填答案数组如 ["0.5"]；简答/计算：answer 填参考答案文本(字符串)。
- 对应不上或答案文本里没有的，answer 填 null。analysis 可选(解析要点)。只返回 JSON，不要多余说明。`;

/** 用 AI 把一份参考答案文本对应到给定题目，返回与题目等长、同序的答案数组。 */
export async function aiFillAnswers(
  env: AppEnv,
  questions: { stem: string; type: string; options: string[] }[],
  answerText: string,
): Promise<FilledAnswer[]> {
  const cfg = aiConfig(env);
  const qList = questions.map((q, i) =>
    `【第${i + 1}题·${q.type}】${q.stem}${q.options.length ? ` 选项: ${q.options.map((o, j) => `${String.fromCharCode(65 + j)}.${o}`).join(" ")}` : ""}`,
  ).join("\n");
  const out = await chat(cfg, {
    system: FILL_SYSTEM,
    messages: [{ role: "user", content: `题目：\n${qList}\n\n参考答案文本：\n${answerText.slice(0, 8000)}` }],
    maxTokens: 3000,
    temperature: 0.1,
  });
  const parsed = parseJsonLoose<{ answers?: FilledAnswer[] }>(out);
  return Array.isArray(parsed?.answers) ? parsed!.answers! : [];
}

