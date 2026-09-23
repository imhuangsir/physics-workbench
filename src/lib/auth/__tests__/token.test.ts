import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../token";

const SECRET = "unit-test-secret-at-least-32-bytes-long!!";

describe("token", () => {
  it("学生 token 往返", async () => {
    const t = await signToken({ sub: 7, role: "student", classId: 3, lv: 0 }, SECRET);
    const p = await verifyToken(t, SECRET);
    expect(p).toMatchObject({ sub: 7, role: "student", classId: 3, lv: 0 });
  });

  it("老师 token 往返", async () => {
    const t = await signToken({ role: "teacher" }, SECRET);
    const p = await verifyToken(t, SECRET);
    expect(p.role).toBe("teacher");
  });

  it("被篡改的 token 校验失败", async () => {
    const t = await signToken({ role: "teacher" }, SECRET);
    await expect(verifyToken(t + "x", SECRET)).rejects.toThrow();
  });

  it("错误密钥校验失败", async () => {
    const t = await signToken({ role: "teacher" }, SECRET);
    await expect(verifyToken(t, "another-wrong-secret-32bytes-long!!!!")).rejects.toThrow();
  });
});
