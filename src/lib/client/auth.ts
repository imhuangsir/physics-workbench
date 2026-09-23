const KEY = "pw_auth";
export type Session = { token: string; role: "student" | "teacher"; student?: { id: number; name: string; classId: number } };

export function saveSession(s: Session) { localStorage.setItem(KEY, JSON.stringify(s)); }

export function getSession(): Session | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "null"); } catch { return null; }
}

export function clearSession() { localStorage.removeItem(KEY); }
