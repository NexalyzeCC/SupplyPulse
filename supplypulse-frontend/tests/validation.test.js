import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  validateScoreOutput,
  validateSignals,
} = require("../netlify/functions/lib/validation");


describe("validateScoreOutput", () => {
  it("clamps an out-of-range score into 0-100", () => {
    expect(validateScoreOutput({ score: 250, summary: "x" }).score).toBe(100);
    expect(validateScoreOutput({ score: -40, summary: "x" }).score).toBe(0);
  });

  it("rounds a fractional score", () => {
    expect(validateScoreOutput({ score: 72.6, summary: "x" }).score).toBe(73);
  });

  it("coerces an unknown direction to stable", () => {
    const out = validateScoreOutput({ score: 50, direction: "sideways", summary: "x" });
    expect(out.direction).toBe("stable");
  });

  it("returns usable defaults for junk input", () => {
    const out = validateScoreOutput(null);
    expect(out.score).toBe(50);
    expect(out.direction).toBe("stable");
    expect(out.recommendations).toEqual([]);
  });

  it("sorts recommendations by priority and drops empty actions", () => {
    const out = validateScoreOutput({
      score: 50,
      summary: "x",
      recommendations: [
        { priority: 3, action: "third",  rationale: "" },
        { priority: 1, action: "first",  rationale: "" },
        { priority: 2, action: "",       rationale: "dropped" },
      ],
    });
    expect(out.recommendations.map((r) => r.action)).toEqual(["first", "third"]);
  });
});

describe("validateSignals", () => {
  it("accepts both a bare array and { signals: [...] }", () => {
    const one = [{ type: "news", severity: "high", summary: "a", confidence: 80 }];
    expect(validateSignals(one)).toHaveLength(1);
    expect(validateSignals({ signals: one })).toHaveLength(1);
  });

  it("drops signals with an empty summary", () => {
    expect(validateSignals([{ type: "news", severity: "low", summary: "" }])).toHaveLength(0);
  });

  it("nulls a non-http source_url rather than trusting it", () => {
    const [s] = validateSignals([
      { type: "news", severity: "low", summary: "a", source_url: "javascript:alert(1)" },
    ]);
    expect(s.source_url).toBeNull();
  });

  it("returns [] for a non-array input", () => {
    expect(validateSignals("nope")).toEqual([]);
  });
});
