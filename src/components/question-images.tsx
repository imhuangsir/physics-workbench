import { cn } from "@/lib/utils";

/** 解析题目的 images_json 字段为字符串数组（容错）。 */
export function parseImages(json?: string | null): string[] {
  try { return json ? (JSON.parse(json) as string[]).filter((s) => typeof s === "string" && s) : []; } catch { return []; }
}

/** 题目配图（图1/图2…）：把存进题目的图片(data URL)按行展示，师生各处复用。 */
export function QuestionImages({ images, className }: { images?: string[] | null; className?: string }) {
  if (!images || images.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt={`配图 ${i + 1}`}
          className="max-h-56 w-auto rounded-lg border border-border bg-white object-contain" />
      ))}
    </div>
  );
}
