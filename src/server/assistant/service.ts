import { chat, aiConfig, type ChatMessage } from "@/lib/ai/provider";
import type { AppEnv } from "@/lib/env";
import { appError } from "@/lib/http";

const SYSTEM = `你是"物理小助手"，面向中国大陆八年级（初二）学生的物理学习助手。
职责：用初二学生能懂的语言，讲解物理概念、公式、单位、实验与解题思路，多用生活例子与类比。
风格：亲切、鼓励、条理清晰；步骤化拆解；必要时给出关键公式并解释每个量的含义与单位。
边界：
- 只回答物理及相关学习方法问题；与物理无关的问题礼貌引导回学习。
- 若学生疑似直接索要"正在做的作业/考试题"的最终答案，先引导思路、给方法与提示，鼓励独立完成，不直接把整题答案抄给他。
- 不确定或超纲的内容如实说明，不编造。
- 不索取或记录任何个人隐私信息。
输出：简体中文，简洁分点，避免长篇大论。`;

const MAX_TURNS = 12; // 只保留最近若干轮，控制上下文与 token

export interface AssistantInput {
  messages: ChatMessage[]; // 客户端持有的历史（user/assistant 交替）
}

export async function assistantReply(env: AppEnv, input: AssistantInput): Promise<{ reply: string }> {
  const msgs = (input.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (msgs.length === 0 || msgs[msgs.length - 1].role !== "user") {
    throw appError("validation_error", "请输入你的问题");
  }
  const reply = await chat(aiConfig(env), { system: SYSTEM, messages: msgs, maxTokens: 1024, temperature: 0.5 });
  return { reply: reply || "（暂时没有想到答案，换个问法再试试？）" };
}
