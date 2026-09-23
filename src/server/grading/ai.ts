import { chat, parseJsonLoose, type AiConfig } from "@/lib/ai/provider";

export interface ShortGradeInput {
  stem: string;
  reference: string | null;
  fullScore: number;
  studentAnswer: string;
}
export interface ShortGradeResult {
  score: number;
  feedback: string;
  isCorrect: number; // 1 | 0
  needsReview: boolean; // AI 输出无法解析时置 true，提示人工复核
}

const SYSTEM = (full: number) => `你是一位严谨、鼓励式的八年级物理阅卷老师。
请依据【题目】【参考要点/解析】【满分】，为【学生作答】评分。
评分原则：看物理概念是否正确、关键步骤与结论是否到位；允许合理的表述差异与等价写法；空白或完全离题给 0 分。
严格只输出一个 JSON 对象，不要额外文字：
{"score": <0~${full} 的数字，可保留 1 位小数>, "feedback": "<简短中文评语，指出得分点与失分点及改进方向>", "correct": <true 表示基本正确 / false>}`;

/** 用 AI 为单个简答作答打分。纯函数式（不碰数据库），便于替换/测试。 */
export async function gradeShortWithAi(cfg: AiConfig, input: ShortGradeInput): Promise<ShortGradeResult> {
  const user = `【题目】${input.stem}
【参考要点/解析】${input.reference?.trim() || "（无，请依据八年级物理常识判断）"}
【满分】${input.fullScore}
【学生作答】${input.studentAnswer.trim() || "（空白未作答）"}`;

  const text = await chat(cfg, {
    system: SYSTEM(input.fullScore),
    messages: [{ role: "user", content: user }],
    maxTokens: 500,
    temperature: 0.2,
  });

  const parsed = parseJsonLoose<{ score: number; feedback: string; correct: boolean }>(text);
  if (!parsed) {
    return { score: 0, feedback: `AI 未能给出规范评分，请人工复核。模型原文：${text.slice(0, 160)}`, isCorrect: 0, needsReview: true };
  }
  const score = Math.max(0, Math.min(input.fullScore, Number(parsed.score) || 0));
  return {
    score,
    feedback: (parsed.feedback ?? "").toString().slice(0, 500),
    isCorrect: parsed.correct ? 1 : 0,
    needsReview: false,
  };
}
