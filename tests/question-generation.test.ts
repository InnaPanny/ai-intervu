import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGeneratedQuestions, normalizeQuestionGenerationInput } from "../src/lib/ai/question-generation.ts";

const input = normalizeQuestionGenerationInput({
  target: {
    id: "target-1",
    industry: "互联网",
    role: "产品经理",
    experience: "3 年",
    createdAt: "2026-06-14T00:00:00.000Z",
  },
  existingIntents: ["self_intro", "priority"],
  existingQuestions: ["请做一下自我介绍。", "多个任务同时紧急时如何安排优先级？"],
});

test("题目生成输入必须包含有效求职目标，并限制资料长度", () => {
  assert.equal(normalizeQuestionGenerationInput({ target: { role: "产品经理" } }), undefined);
  const normalized = normalizeQuestionGenerationInput({
    target: {
      id: "target-1",
      industry: "互联网",
      role: "产品经理",
      experience: "3 年",
      resume: "A".repeat(25_000),
      createdAt: "2026-06-14T00:00:00.000Z",
    },
    existingIntents: ["self_intro"],
    existingQuestions: ["已有问题"],
  });
  assert.equal(normalized?.target.resume?.length, 20_000);
});

test("远程题目生成最多接受 15 道新题和 7 道核心题", () => {
  assert.ok(input);
  const questions = normalizeGeneratedQuestions({
    questions: Array.from({ length: 20 }, (_, index) => ({
      text: `新的面试问题 ${index}`,
      intent: `new_intent_${index}`,
      category: "岗位能力",
      reason: "与目标岗位相关",
      focus: "说明判断依据",
      core: true,
    })),
  }, input);

  assert.equal(questions.length, 15);
  assert.equal(questions.filter((question) => question.core).length, 7);
  assert.ok(questions.every((question) => question.targetId === "target-1" && question.status === "pending"));
});

test("远程题目按历史意图、题目文本和当前批次去重", () => {
  assert.ok(input);
  const questions = normalizeGeneratedQuestions({
    questions: [
      { text: "换一种方式自我介绍", intent: "self_intro", category: "通用", reason: "已有", focus: "已有", core: true },
      { text: "请做一下自我介绍。", intent: "another_intro", category: "通用", reason: "已有", focus: "已有", core: true },
      { text: "面对多个紧急任务，你如何判断优先级？", intent: "prioritization_method", category: "岗位能力", reason: "已有同义题", focus: "判断标准", core: true },
      { text: "你如何验证产品需求？", intent: "requirement_validation", category: "岗位能力", reason: "岗位相关", focus: "判断标准", core: true },
      { text: "你如何安排任务优先级？", intent: "priority_duplicate", category: "岗位能力", reason: "重复", focus: "判断标准", core: false },
    ],
  }, input);

  assert.deepEqual(questions.map((question) => question.intent), ["requirement_validation"]);
});
