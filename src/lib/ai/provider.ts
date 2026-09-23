import { appError } from "@/lib/http";
import type { AppEnv } from "@/lib/env";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  style: "anthropic" | "openai";
}

/**
 * AI 网关配置：默认沿用 Claude Code 当前所用网关（Anthropic Messages 兼容）。
 * 真正的密钥只从环境注入（.dev.vars 本地 / `wrangler secret put AI_API_KEY` 线上），
 * 绝不硬编码进源码、绝不入库、绝不入日志。
 */
export function aiConfig(env: AppEnv): AiConfig {
  return {
    baseUrl: (env.AI_BASE_URL || "https://ps.air-outer.com").replace(/\/+$/, ""),
    apiKey: env.AI_API_KEY || "",
    model: env.AI_MODEL || "deepseek-v4-flash",
    style: env.AI_API_STYLE === "openai" ? "openai" : "anthropic",
  };
}

export interface ChatOptions {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
}

/** 调用 AI 网关做一次对话补全，返回纯文本。密钥缺失或网关报错都抛 AppError（不泄漏细节到用户）。 */
export async function chat(cfg: AiConfig, opts: ChatOptions): Promise<string> {
  if (!cfg.apiKey) {
    throw appError("ai_unconfigured", "AI 服务尚未配置密钥，请在 .dev.vars 或 Secret 中填写 AI_API_KEY");
  }
  const maxTokens = opts.maxTokens ?? 1024;
  const temperature = opts.temperature ?? 0.3;
  try {
    return cfg.style === "openai"
      ? await openaiChat(cfg, opts, maxTokens, temperature)
      : await anthropicChat(cfg, opts, maxTokens, temperature);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("__ai_http__")) {
      console.error("[ai]", e.message); // 仅记摘要，不含密钥/载荷
      throw appError("ai_error", "AI 服务暂时不可用，请稍后再试");
    }
    throw e;
  }
}

async function anthropicChat(cfg: AiConfig, opts: ChatOptions, maxTokens: number, temperature: number): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
      "authorization": `Bearer ${cfg.apiKey}`,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      temperature,
      system: opts.system,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) throw new Error(`__ai_http__ anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
}

async function openaiChat(cfg: AiConfig, opts: ChatOptions, maxTokens: number, temperature: number): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "system", content: opts.system }, ...opts.messages],
    }),
  });
  if (!res.ok) throw new Error(`__ai_http__ openai ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

/** 从可能带 ```json 围栏或前后缀说明的模型输出里稳健地取出第一个 JSON 对象。 */
export function parseJsonLoose<T>(text: string): T | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
