import type { EvaluationRating, MasteryLevel, Question } from "@/lib/types";

export function localDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function masteryFromResult(rating: EvaluationRating, usedHint: boolean): MasteryLevel {
  if (rating === "信息不足") return "不熟悉";
  if (rating === "需要加强") return usedHint ? "不熟悉" : "初步掌握";
  if (rating === "基本达标") return usedHint ? "初步掌握" : "基本掌握";
  return usedHint ? "熟练掌握" : "稳定掌握";
}

export function focusPracticePatch(question: Question, rating: EvaluationRating, usedHint: boolean): Partial<Question> {
  if (!question.inFocusPractice) return {};

  const today = localDate();
  const isDue = !question.nextReviewDate || question.nextReviewDate <= today;
  const isNewIntervalReview = isDue && question.lastIntervalReviewDate !== today;
  const excellentInterval = isNewIntervalReview && rating === "表现优秀" && !usedHint;
  const nextStreak = excellentInterval ? (question.intervalExcellentStreak ?? 0) + 1 : isNewIntervalReview ? 0 : question.intervalExcellentStreak ?? 0;
  const completed = nextStreak >= 2;

  return {
    mastery: masteryFromResult(rating, usedHint),
    reviewCount: (question.reviewCount ?? 0) + 1,
    intervalExcellentStreak: nextStreak,
    lastIntervalReviewDate: isNewIntervalReview ? today : question.lastIntervalReviewDate,
    nextReviewDate: completed ? undefined : rating === "需要加强" || rating === "信息不足" ? today : localDate(1),
    focusCompleted: completed,
    inFocusPractice: !completed,
  };
}
