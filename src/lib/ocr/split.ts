export type DraftType = "single" | "multi" | "fill" | "short";
export interface DraftQuestion {
  stem: string;
  type: DraftType;
  options: string[];
}

const MARKER = /^\s*\(?\d{1,3}\)?\s*[.、．)]/; // 行首题号：1. / 1、/ 1) / (1)
const OPT = /([A-H])\s*[.、．)]\s*([^\n]*)/g; // 选项：A. xxx

/** 把 OCR 整段文本按题号切分成草稿题目，并粗略判型（老师可再改）。 */
export function splitQuestions(text: string): DraftQuestion[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const blocks: string[] = [];
  let cur = "";
  for (const line of lines) {
    if (MARKER.test(line)) {
      if (cur.trim()) blocks.push(cur.trim());
      cur = line;
    } else {
      cur = cur ? `${cur}\n${line}` : line;
    }
  }
  if (cur.trim()) blocks.push(cur.trim());
  return blocks.map(parseBlock).filter((b) => b.stem);
}

function parseBlock(block: string): DraftQuestion {
  const options: string[] = [];
  let m: RegExpExecArray | null;
  OPT.lastIndex = 0;
  while ((m = OPT.exec(block))) options.push(m[2].trim());

  const stem = block
    .replace(OPT, "")
    .replace(/^\s*\(?\d{1,3}\)?\s*[.、．)]\s*/, "")
    .replace(/\s+\n/g, "\n")
    .trim();

  let type: DraftType;
  if (options.length >= 2) type = /多选|不定项/.test(block) ? "multi" : "single";
  else if (/_{2,}|（\s*）|\(\s*\)/.test(block)) type = "fill";
  else type = "short";

  return { stem: stem || block, type, options };
}
