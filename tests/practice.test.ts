import assert from "node:assert/strict";
import test from "node:test";
import { focusPracticePatch, localDate, masteryFromResult } from "../src/lib/practice.ts";
import type { Question } from "../src/lib/types.ts";

const question: Question = {
  id: "question-1",
  targetId: "target-1",
  text: "请介绍一次真实经历。",
  intent: "custom",
  category: "行为面试",
  reason: "测试",
  focus: "真实经历",
  core: false,
  status: "completed",
  source: "generated",
  inFocusPractice: true,
  nextReviewDate: localDate(),
  createdAt: "2026-06-14T00:00:00.000Z",
};

test("使用提示会降低本次独立掌握程度判断", () => {
  assert.equal(masteryFromResult("表现优秀", false), "稳定掌握");
  assert.equal(masteryFromResult("表现优秀", true), "熟练掌握");
  assert.equal(masteryFromResult("基本达标", true), "初步掌握");
});

test("同一天重复优秀不会重复累计间隔复习", () => {
  const first = focusPracticePatch(question, "表现优秀", false);
  const repeated = focusPracticePatch({ ...question, ...first }, "表现优秀", false);

  assert.equal(first.intervalExcellentStreak, 1);
  assert.equal(repeated.intervalExcellentStreak, 1);
  assert.equal(repeated.inFocusPractice, true);
});

test("连续两次不同日期的间隔复习优秀后自动完成强化", () => {
  const patch = focusPracticePatch({
    ...question,
    intervalExcellentStreak: 1,
    lastIntervalReviewDate: localDate(-1),
    nextReviewDate: localDate(),
  }, "表现优秀", false);

  assert.equal(patch.intervalExcellentStreak, 2);
  assert.equal(patch.focusCompleted, true);
  assert.equal(patch.inFocusPractice, false);
});

test("需要加强的题目继续进入当日复习", () => {
  const patch = focusPracticePatch(question, "需要加强", false);

  assert.equal(patch.nextReviewDate, localDate());
  assert.equal(patch.focusCompleted, false);
  assert.equal(patch.inFocusPractice, true);
});

test("非重点练习题不产生复习调度修改", () => {
  assert.deepEqual(focusPracticePatch({ ...question, inFocusPractice: false }, "表现优秀", false), {});
});
