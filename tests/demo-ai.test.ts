import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAnswer, generateQuestions, inferQuestionIntent } from "../src/lib/demo-ai.ts";
import type { Target } from "../src/lib/types.ts";

const target: Target = {
  id: "target-1",
  industry: "互联网",
  role: "产品经理",
  experience: "3 年",
  createdAt: "2026-06-14T00:00:00.000Z",
};

test("每批最多生成 15 道题，其中最多 7 道核心题", () => {
  const questions = generateQuestions(target, new Set());

  assert.equal(questions.length, 15);
  assert.equal(questions.filter((question) => question.core).length, 7);
  assert.ok(questions.every((question) => question.targetId === target.id));
});

test("历史考察意图参与去重，原题不会再次生成", () => {
  const questions = generateQuestions(target, new Set(["self_intro", "motivation"]));

  assert.ok(!questions.some((question) => question.intent === "self_intro"));
  assert.ok(!questions.some((question) => question.intent === "motivation"));
});

test("只有提供简历或 JD 时才生成对应针对题", () => {
  const generic = generateQuestions(target, new Set());
  const contextual = generateQuestions({ ...target, resume: "真实简历内容", jd: "真实岗位职责" }, new Set());

  assert.ok(!generic.some((question) => question.intent === "resume_deep_dive"));
  assert.ok(!generic.some((question) => question.intent === "jd_alignment"));
  assert.ok(contextual.some((question) => question.intent === "resume_deep_dive"));
  assert.ok(contextual.some((question) => question.intent === "jd_alignment"));
});

test("现实面试问题可以映射到已有考察意图", () => {
  assert.equal(inferQuestionIntent("请做一下自我介绍"), "self_intro");
  assert.equal(inferQuestionIntent("你如何处理跨团队协作？"), "collaboration");
  assert.equal(inferQuestionIntent("这是一个自定义问题"), "custom:这是一个自定义问题");
});

test("信息不足时标记缺口，不虚构经历、成果或数据", () => {
  const result = evaluateAnswer("我负责推进项目。");

  assert.equal(result.rating, "信息不足");
  assert.ok(result.informationGaps.length > 0);
  assert.match(result.reference, /请在确认事实准确后/);
  assert.doesNotMatch(result.reference, /\d+%|百万|千万/);
});

test("信息不足只标记缺口，不生成追问", () => {
  const result = evaluateAnswer("回答很短");
  assert.ok(result.informationGaps.length > 0);
  assert.equal("followUp" in result, false);
});

test("完整真实结构可以得到较高评级且不制造信息缺口", () => {
  const answer = "我负责一个真实项目的需求梳理和推进。我先确认目标，因为需要平衡用户价值和交付风险，所以基于优先级判断，再与团队协作完成方案和交付。最终完成既定产出，并收到了用户反馈。之后我进行了复盘，总结了改进经验。".repeat(3);
  const result = evaluateAnswer(answer, {
    intent: "challenge",
    category: "行为面试",
    focus: "讲清背景、行动和结果",
    text: "请介绍一次你解决复杂问题的经历。",
  });

  assert.equal(result.rating, "表现优秀");
  assert.deepEqual(result.informationGaps, []);
});

test("岗位认知题评价观点与依据，不要求项目结果和个人贡献", () => {
  const result = evaluateAnswer("我认为核心职责是识别用户价值、判断业务优先级，并协调团队推动产品落地。因为岗位需要在用户需求、技术能力和业务目标之间做取舍。", {
    intent: "role_knowledge",
    category: "岗位认知",
    focus: "结合岗位要求而非泛泛而谈",
    text: "你如何理解产品经理的核心职责？",
  });

  assert.ok(result.dimensions.some((item) => item.dimension === "观点与理解深度"));
  assert.ok(!result.dimensions.some((item) => item.dimension === "结果与个人贡献"));
  assert.ok(!result.informationGaps.some((gap) => gap.includes("结果") || gap.includes("个人行动")));
});

test("方法类题评价步骤和判断标准，不强制要求以往项目数据", () => {
  const result = evaluateAnswer("我会首先确认任务影响范围和截止时间，然后判断依赖关系与风险，最后按重要性和紧急度排序，并持续验证是否需要调整。", {
    intent: "priority",
    category: "岗位能力",
    focus: "说明可执行的判断标准",
    text: "多个任务同时紧急时，你如何安排优先级？",
  });

  assert.ok(result.dimensions.some((item) => item.dimension === "方法与判断标准"));
  assert.ok(!result.dimensions.some((item) => item.dimension === "结果与个人贡献"));
  assert.ok(!result.informationGaps.some((gap) => gap.includes("数据") || gap.includes("个人行动")));
});

test("行为经历题仍检查个人行动和真实结果", () => {
  const result = evaluateAnswer("团队遇到了一个复杂问题，后来项目继续推进。", {
    intent: "challenge",
    category: "行为面试",
    focus: "讲清背景、行动和结果",
    text: "请介绍一次你解决复杂问题的经历。",
  });

  assert.ok(result.dimensions.some((item) => item.dimension === "个人行动与判断"));
  assert.ok(result.informationGaps.some((gap) => gap.includes("具体行动")));
  assert.ok(result.informationGaps.some((gap) => gap.includes("真实结果")));
});
