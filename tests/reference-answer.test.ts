import assert from "node:assert/strict";
import test from "node:test";
import {
  createLocalSafeReference,
  createResumeGroundedSafeReference,
  hasUnsupportedNumbers,
  isSubstantiveReference,
  normalizeReferenceInput,
  referenceProfile,
  requiresPersonalFactVerification,
} from "../src/lib/ai/reference-answer.ts";

test("本地安全参考应答只整理用户原回答并保留信息缺口", () => {
  const result = createLocalSafeReference({
    question: "请介绍一次项目经历",
    answer: "我负责梳理需求并推动团队完成交付。",
    informationGaps: ["尚未说明实际结果。"],
  });

  assert.match(result.referenceAnswer, /我负责梳理需求并推动团队完成交付/);
  assert.match(result.referenceAnswer, /尚未说明实际结果/);
  assert.equal(result.mode, "local-safe");
  assert.doesNotMatch(result.referenceAnswer, /\d+%|百万|千万/);
});

test("拒绝 AI 新增用户未提供的数字", () => {
  assert.equal(hasUnsupportedNumbers("最终提升了 30%", "我完成了项目交付"), true);
  assert.equal(hasUnsupportedNumbers("最终提升了 30%", "最终提升了 30%"), false);
});

test("参考应答输入必须包含问题，允许通用题不提供个人回答，并限制上下文长度", () => {
  assert.equal(normalizeReferenceInput({ question: "", answer: "" }), undefined);
  assert.equal(normalizeReferenceInput({ question: "方法题" })?.answer, "");
  const input = normalizeReferenceInput({
    question: "问题",
    answer: "A".repeat(25_000),
    resume: "R".repeat(25_000),
    jd: "J".repeat(15_000),
    intent: "learning",
    focus: "判断标准",
    informationGaps: ["缺口"],
  });
  assert.equal(input?.answer.length, 20_000);
  assert.equal(input?.resume?.length, 20_000);
  assert.equal(input?.jd?.length, 10_000);
  assert.equal(input?.intent, "learning");
  assert.equal(input?.focus, "判断标准");
  assert.deepEqual(input?.informationGaps, ["缺口"]);
});

test("简历中的数字可作为参考应答的已确认事实", () => {
  const sourceText = ["用户回答未包含数字", "简历：负责 3 个项目，覆盖 20 家客户"].join("\n");
  assert.equal(hasUnsupportedNumbers("我负责过 3 个项目，覆盖 20 家客户。", sourceText), false);
  assert.equal(hasUnsupportedNumbers("我负责过 5 个项目。", sourceText), true);
});

test("安全回退引用简历项目事实但排除联系方式", () => {
  const result = createResumeGroundedSafeReference({
    question: "请介绍一项成果",
    answer: "我想介绍一个真实项目。",
    intent: "achievement",
    resume: "手机号：13800138000\n邮箱：test@example.com\n负责客户反馈平台改版，协调研发上线，将处理时长从 5 天缩短至 3 天。",
  });

  assert.match(result.referenceAnswer, /客户反馈平台改版/);
  assert.match(result.referenceAnswer, /5 天缩短至 3 天/);
  assert.doesNotMatch(result.referenceAnswer, /13800138000|test@example.com/);
});

test("方法和认知题允许 Agent 补充专业知识，经历题保持事实约束", () => {
  assert.equal(referenceProfile("learning"), "method");
  assert.equal(referenceProfile("role_knowledge"), "knowledge");
  assert.equal(referenceProfile("challenge"), "experience");
  assert.equal(requiresPersonalFactVerification("challenge"), true);
  assert.equal(requiresPersonalFactVerification("motivation"), true);
  assert.equal(requiresPersonalFactVerification("learning"), false);
});

test("拒绝只复述或轻微改写用户原回答的参考应答", () => {
  const answer = "我会阅读论文和观看专业视频。";
  assert.equal(isSubstantiveReference(answer, answer), false);
  assert.equal(isSubstantiveReference(`我的方法是：${answer}`, answer), false);
  assert.equal(isSubstantiveReference(`${answer}${"我还会根据简历中的真实项目，进一步说明目标、个人行动、判断依据、真实结果和复盘，并确保所有内容都能由已提供的事实确认。".repeat(4)}`, answer), true);
  assert.equal(isSubstantiveReference("我通常先明确学习目标和需要解决的问题，再建立知识地图，区分核心概念、上下游关系和待验证假设。获取信息时，我会优先选择权威论文、官方文档和高质量课程，并通过多个来源交叉校验。随后我会设计一个小型实践任务，把知识用于真实问题，再根据输出结果和反馈修正理解。最后，我会整理可复用的框架并定期复盘，确保学习不止停留在信息收集，而是能够形成解决问题的能力。", answer), true);
  assert.equal(isSubstantiveReference("回答过短", ""), false);
  assert.equal(isSubstantiveReference("我会先明确问题的目标和边界，再建立分析框架，识别关键变量与待验证假设。接着补充必要信息，按照影响程度和验证成本安排优先级，并通过小范围实践验证判断。最后，我会根据结果调整方案、沉淀方法，并在表达时先给出结论，再解释依据和执行步骤。这样既能直接回应问题，也能展示清晰的判断过程和可执行的方法。", ""), true);
});
