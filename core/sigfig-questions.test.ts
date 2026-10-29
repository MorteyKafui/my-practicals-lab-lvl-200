import { describe, expect, test } from "bun:test";

import { createRng } from "./random";
import { mark, makeQuestion } from "./sigfig-questions";
import { decimalsForResolution } from "./sigfigs";

describe("significant-figures trainer", () => {
  test("every generated question accepts its own answer", () => {
    const rng = createRng(7);
    for (let i = 0; i < 300; i++) {
      const q = makeQuestion(rng);
      expect(mark(q, String(q.answer)).correct, JSON.stringify(q)).toBe(true);
    }
  });
  test("dropping a significant trailing zero is caught", () => {
    expect(mark({ kind: "round", value: 0.49996, n: 3, answer: "0.500" }, "0.5").why).toBe("roundZeros");
    expect(mark({ kind: "record", instrument: "rule", resolution: 0.1, unit: "cm", truth: 45, answer: "45.0" }, "45").why).toBe("recordDropped");
    expect(mark({ kind: "record", instrument: "rule", resolution: 0.1, unit: "cm", truth: 45, answer: "45.0" }, "45.00").why).toBe("recordFalse");
  });
  test("half-division resolution records one decimal place", () => {
    expect(decimalsForResolution(0.5)).toBe(1);
    expect(decimalsForResolution(0.25)).toBe(2);
  });
});
