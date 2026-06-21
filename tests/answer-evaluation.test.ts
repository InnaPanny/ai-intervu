import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEvaluationInput, normalizeEvaluationResult } from "../src/lib/ai/answer-evaluation.ts";

test("AI 辅导输入必须包含问题和回答", () => {
  assert.equal(normalizeEvaluationInput({ question: "问题", answer: "" }), undefined);
  assert.deepEqual(normalizeEvaluationInput({ question: "问题", answer: "回答" }), {
    question: "问题",
    answer: "回答",
    intent: undefined,
    category: undefined,
    focus: undefined,
  });
});

test("AI 辅导结果只接受合法评级和结构化维度", () => {
  const result = normalizeEvaluationResult({
    rating: "基本达标",
    dimensions: [
      { dimension: "内容相关性", rating: "基本达标", feedback: "切题。" },
      { dimension: "表达清晰度", rating: "基本达标", feedback: "清晰。" },
      { dimension: "回答完整度", rating: "需要加强", feedback: "需要补充。" },
    ],
    informationGaps: ["缺少判断标准。"],
    outline: ["核心观点", "判断依据", "总结"],
    keywords: ["观点", "依据"],
    improvement: "补充判断标准。",
  });

  assert.equal(result?.rating, "基本达标");
  assert.equal(result?.dimensions.length, 3);
});

test("忽略模型返回的追问字段，并拒绝非法总评级", () => {
  const base = {
    dimensions: [
      { dimension: "内容相关性", rating: "基本达标", feedback: "切题。" },
      { dimension: "表达清晰度", rating: "基本达标", feedback: "清晰。" },
      { dimension: "回答完整度", rating: "需要加强", feedback: "需要补充。" },
    ],
    informationGaps: [],
    followUp: "继续追问",
    outline: ["观点"],
    keywords: ["观点"],
    improvement: "继续优化。",
  };

  assert.equal(normalizeEvaluationResult({ ...base, rating: "85分" }), undefined);
  const result = normalizeEvaluationResult({ ...base, rating: "基本达标" });
  assert.ok(result);
  assert.equal("followUp" in result, false);
});
