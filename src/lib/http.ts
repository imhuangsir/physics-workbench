export class AppError extends Error {
  constructor(public code: string, public message: string, public status: number) {
    super(message);
  }
}

const CODE_STATUS: Record<string, number> = {
  unauthorized: 401, forbidden: 403, student_not_found: 404, duplicate_name: 409,
  session_revoked: 401, validation_error: 400, not_found: 404, conflict: 409,
  ai_unconfigured: 503, ai_error: 502, ocr_unconfigured: 503, ocr_error: 502,
  upload_error: 500, payload_too_large: 413,
};

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function fail(err: unknown): Response {
  if (err instanceof AppError) {
    return Response.json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  const code = "internal_error";
  console.error("[unhandled]", err instanceof Error ? err.message : String(err)); // 不打印密钥/载荷
  return Response.json({ error: { code, message: "服务器内部错误，请稍后重试" } }, { status: 500 });
}

export function appError(code: keyof typeof CODE_STATUS, message: string): AppError {
  return new AppError(code, message, CODE_STATUS[code] ?? 400);
}
