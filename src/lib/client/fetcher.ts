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
export async function uploadImage(file: File): Promise<{ key: string }> {
  const s = getSession();
  const res = await fetch("/api/student/uploads", {
    method: "POST",
    headers: { "Content-Type": file.type, ...(s?.token ? { Authorization: `Bearer ${s.token}` } : {}) },
    body: file,
  });
  const json = await res.json().catch(() => ({})) as { data?: { key: string }; error?: { message?: string } };
  if (!res.ok) throw new Error(json?.error?.message ?? "上传失败");
  return json.data as { key: string };
}

/** 带鉴权拉取图片并生成 object URL（用后请 revoke）。 */
export async function fetchImageUrl(key: string): Promise<string> {
  const s = getSession();
  const res = await fetch(`/api/uploads/${key}`, { headers: s?.token ? { Authorization: `Bearer ${s.token}` } : {} });
  if (!res.ok) throw new Error("图片加载失败");
  return URL.createObjectURL(await res.blob());
}
