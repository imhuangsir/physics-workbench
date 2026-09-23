import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export type StudentClaims = { sub: number; role: "student"; classId: number; lv: number };
export type TeacherClaims = { role: "teacher" };
export type Claims = StudentClaims | TeacherClaims;

const enc = (secret: string) => new TextEncoder().encode(secret);

export async function signToken(claims: Claims, secret: string): Promise<string> {
  // 设计里 sub 存学生 id（number），而 jose 的 JWTPayload 把保留字段 sub 约束为 string；
  // 运行时 number 会被正常 JSON 编码，这里在边界处做一次断言即可。
  return await new SignJWT({ ...claims } as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(enc(secret));
}

export async function verifyToken<T extends Claims = Claims>(token: string, secret: string): Promise<T> {
  const { payload } = await jwtVerify(token, enc(secret), { algorithms: ["HS256"] });
  return payload as unknown as T;
}
