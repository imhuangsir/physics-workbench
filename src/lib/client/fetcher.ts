import { getSession, clearSession } from "./auth";

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const s = getSession();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (s?.token) headers.set("Authorization", `Bearer ${s.token}`);
  const res = await fetch(path, { ...init, headers });
  const json = await res.json().catch(() => ({})) as { data?: T; error?: { code?: string; message?: string } };
  if (!res.ok) {
    const code = json?.error?.code;
    if (res.status === 401 || code === "session_revoked") {
      clearSession();
      if (typeof window !== "undefined") window.location.href = "/login";
    }
    throw new Error(json?.error?.message ?? "请求失败");
  }
  return json.data as T;
}

/** 直传图片二进制到 R2（不经 JSON），返回存储 key。 */
export async function uploadImage(file: File | Blob): Promise<{ key: string }> {
  const s = getSession();
  const type = (file as File).type || "image/jpeg";
  const res = await fetch("/api/student/uploads", {
    method: "POST",
    headers: { "Content-Type": type, ...(s?.token ? { Authorization: `Bearer ${s.token}` } : {}) },
    body: file,
  });
  const json = await res.json().catch(() => ({})) as { data?: { key: string }; error?: { message?: string } };
  if (!res.ok) throw new Error(json?.error?.message ?? "上传失败");
  return json.data as { key: string };
}

/** 浏览器端压缩图片（等比缩放 + JPEG），控制体积以便存入 D1。GIF 原样返回。 */
export async function compressImage(file: File, maxDim = 1280, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file);
    });
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl;
    });
    let { width, height } = img;
    if (Math.max(width, height) > maxDim) {
      const s = maxDim / Math.max(width, height);
      width = Math.round(width * s); height = Math.round(height * s);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    return blob ? new File([blob], "upload.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/** 压缩为 JPEG data URL（等比缩放，透明底填白，适合题目配图/公式图存入 D1）。入参可为 File/Blob 或 data URL 字符串。 */
export async function compressToDataURL(src: Blob | string, maxDim = 1000, quality = 0.82): Promise<string> {
  try {
    const dataUrl = typeof src === "string" ? src : await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(src); });
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
    let width = img.naturalWidth, height = img.naturalHeight;
    if (!width || !height) return "";
    if (Math.max(width, height) > maxDim) { const s = maxDim / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s); }
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d"); if (!ctx) return "";
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch { return ""; }
}
export async function fetchImageUrl(key: string): Promise<string> {
  const s = getSession();
  const res = await fetch(`/api/uploads/${key}`, { headers: s?.token ? { Authorization: `Bearer ${s.token}` } : {} });
  if (!res.ok) throw new Error("图片加载失败");
  return URL.createObjectURL(await res.blob());
}

/** 带鉴权拉取文件并触发浏览器下载（用于 CSV 导出，避免把 token 放进 URL）。 */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const s = getSession();
  const res = await fetch(path, { headers: s?.token ? { Authorization: `Bearer ${s.token}` } : {} });
  if (!res.ok) throw new Error("下载失败");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = fallbackName; a.click();
  URL.revokeObjectURL(url);
}
