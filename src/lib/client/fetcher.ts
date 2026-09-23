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
