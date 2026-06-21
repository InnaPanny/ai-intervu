import type { DimensionEvaluation, EvaluationRating } from "@/lib/types";

const ratings: EvaluationRating[] = ["表现优秀", "基本达标", "需要加强", "信息不足"];

export type AnswerEvaluationInput = {
  question: string;
  answer: string;
  intent?: string;
  category?: string;
  focus?: string;
};

export type AnswerEvaluation = {
  rating: EvaluationRating;
  dimensions: DimensionEvaluation[];
  informationGaps: string[];
  outline: string[];
  keywords: string[];
  improvement: string;
};

export function normalizeEvaluationInput(value: unknown): AnswerEvaluationInput | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Partial<AnswerEvaluationInput>;
  if (typeof input.question !== "string" || typeof input.answer !== "string") return undefined;
  const question = normalize(input.question).slice(0, 1_000);
  const answer = normalize(input.answer).slice(0, 20_000);
  if (!question || !answer) return undefined;

  return {
    question,
    answer,
    intent: typeof input.intent === "string" ? normalize(input.intent).slice(0, 200) : undefined,
    category: typeof input.category === "string" ? normalize(input.category).slice(0, 200) : undefined,
    focus: typeof input.focus === "string" ? normalize(input.focus).slice(0, 500) : undefined,
  };
}

export function normalizeEvaluationResult(value: unknown): AnswerEvaluation | undefined {
  if (!value || typeof value !== "object") return undefined;
  const result = value as Partial<AnswerEvaluation>;
  if (!isRating(result.rating) || !Array.isArray(result.dimensions) || typeof result.improvement !== "string") return undefined;

  const dimensions = result.dimensions
    .filter((item): item is DimensionEvaluation => Boolean(
      item && typeof item.dimension === "string" && isRating(item.rating) && typeof item.feedback === "string",
    ))
    .slice(0, 6)
    .map((item) => ({
      dimension: normalize(item.dimension).slice(0, 100),
      rating: item.rating,
      feedback: normalize(item.feedback).slice(0, 500),
    }))
    .filter((item) => item.dimension && item.feedback);

  const outline = stringList(result.outline, 5, 200);
  const keywords = stringList(result.keywords, 8, 50);
  if (dimensions.length < 3 || !outline.length || !keywords.length) return undefined;

  const informationGaps = stringList(result.informationGaps, 8, 500);

  return {
    rating: result.rating,
    dimensions,
    informationGaps,
    outline,
    keywords,
    improvement: normalize(result.improvement).slice(0, 1_000),
  };
}

function stringList(value: unknown, limit: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string")
    .map((item) => normalize(item).slice(0, maxLength))
    .filter(Boolean)
    .slice(0, limit);
}

function isRating(value: unknown): value is EvaluationRating {
  return typeof value === "string" && ratings.includes(value as EvaluationRating);
}

function normalize(value: string) {
  return value.replace(/\0/g, "").replace(/[^\S\r\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
