import { SignJWT, jwtVerify } from "jose";

export type StudentClaims = { sub: number; role: "student"; classId: number; lv: number };
export type TeacherClaims = { role: "teacher" };
export type Claims = StudentClaims | TeacherClaims;

const enc = (secret: string) => new TextEncoder().encode(secret);

export async function signToken(claims: Claims, secret: string): Promise<string> {
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(enc(secret));
}

export async function verifyToken<T extends Claims = Claims>(token: string, secret: string): Promise<T> {
  const { payload } = await jwtVerify(token, enc(secret), { algorithms: ["HS256"] });
  return payload as unknown as T;
}
