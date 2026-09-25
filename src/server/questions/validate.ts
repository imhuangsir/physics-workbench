import { appError } from "../../lib/http";

export type QuestionType = "single" | "multi" | "fill" | "short";
export type Option = { key: string; text: string };
export interface QuestionInput {
  type: QuestionType; stem: string;
  options?: Option[]; answer?: string | string[] | null;
  analysis?: string; knowledgeTags?: string[]; chapter?: string; difficulty?: number;
  images?: string[];
}

/** 校验并归一化为可入库的 JSON 字段；非法则抛 validation_error */
export function normalizeQuestion(input: QuestionInput) {
  const stem = (input.stem ?? "").trim();
  if (!stem) throw appError("validation_error", "题干不能为空");
  let optionsJson: string | null = null;
  let answerJson: string | null = null;

  if (input.type === "single" || input.type === "multi") {
    if (!input.options?.length) throw appError("validation_error", "选择题必须提供选项");
    optionsJson = JSON.stringify(input.options);
    const keys = new Set(input.options.map((o) => o.key));
    if (input.type === "single") {
      if (typeof input.answer !== "string" || !keys.has(input.answer))
        throw appError("validation_error", "单选答案必须是选项之一");
      answerJson = JSON.stringify(input.answer);
    } else {
      if (!Array.isArray(input.answer) || input.answer.length === 0 || input.answer.some((k) => !keys.has(k)))
        throw appError("validation_error", "多选答案必须是选项子集且非空");
      answerJson = JSON.stringify(input.answer);
    }
  } else if (input.type === "fill") {
    const arr = Array.isArray(input.answer) ? input.answer : [];
    if (arr.length === 0) throw appError("validation_error", "填空题必须提供至少一个可接受答案");
    answerJson = JSON.stringify(arr);
  } // short: options/answer 均为 null

  return {
    type: input.type, stem, optionsJson, answerJson,
    analysis: input.analysis?.trim() || null,
    knowledgeTagsJson: JSON.stringify(input.knowledgeTags ?? []),
    imagesJson: Array.isArray(input.images) && input.images.length ? JSON.stringify(input.images.filter((s) => typeof s === "string" && s)) : null,
    chapter: input.chapter?.trim() || null,
    difficulty: input.difficulty ?? 1,
  };
}
