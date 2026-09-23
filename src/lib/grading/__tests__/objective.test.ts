import { describe, it, expect } from "vitest";
import { gradeAnswer } from "../objective";

describe("gradeAnswer", () => {
  const full = 10;
  it("单选正确得满分", () => {
    expect(gradeAnswer({ type: "single", answer: "A", content: "A", full })).toEqual({ isCorrect: 1, score: 10 });
  });
  it("单选错误得 0", () => {
    expect(gradeAnswer({ type: "single", answer: "A", content: "B", full })).toEqual({ isCorrect: 0, score: 0 });
  });
  it("多选完全一致得满分（乱序也算对）", () => {
    expect(gradeAnswer({ type: "multi", answer: ["A", "C"], content: ["C", "A"], full })).toEqual({ isCorrect: 1, score: 10 });
  });
  it("多选部分正确且无错选得半分", () => {
    expect(gradeAnswer({ type: "multi", answer: ["A", "B", "C"], content: ["A", "B"], full })).toEqual({ isCorrect: 0, score: 5 });
  });
  it("多选有错选得 0", () => {
    expect(gradeAnswer({ type: "multi", answer: ["A", "B"], content: ["A", "D"], full })).toEqual({ isCorrect: 0, score: 0 });
  });
  it("多选空作答得 0", () => {
    expect(gradeAnswer({ type: "multi", answer: ["A"], content: [], full })).toEqual({ isCorrect: 0, score: 0 });
  });

  it("填空归一化命中（去空白+全角转半角+大小写不敏感）", () => {
    expect(gradeAnswer({ type: "fill", answer: ["2m/s", "2 m/s"], content: " ２M/S ", full })).toEqual({ isCorrect: 1, score: 10 });
  });
  it("填空不命中得 0", () => {
    expect(gradeAnswer({ type: "fill", answer: ["2m/s"], content: "3m/s", full })).toEqual({ isCorrect: 0, score: 0 });
  });
  it("简答本轮不判分", () => {
    expect(gradeAnswer({ type: "short", answer: null, content: "任何文本", full })).toEqual({ isCorrect: null, score: null });
  });
});
