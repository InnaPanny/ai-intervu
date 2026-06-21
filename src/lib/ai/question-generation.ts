import type { Question, Target } from "@/lib/types";

const intentKeywords: Array<[string, string[]]> = [
  ["self_intro", ["自我介绍"]],
  ["motivation", ["为什么选择", "应聘这个岗位", "求职动机"]],
  ["strength", ["优势", "适合这个岗位"]],
  ["challenge", ["复杂问题", "解决问题"]],
  ["collaboration", ["跨团队", "协作"]],
  ["failure", ["没有达到预期", "失败", "挫折"]],
  ["priority", ["优先级", "多个任务"]],
  ["learning", ["陌生领域", "快速学习"]],
  ["conflict", ["意见不一致", "冲突"]],
  ["achievement", ["代表你能力的成果", "最有成就", "最成功"]],
  ["pressure", ["压力下", "压力最大的"]],
  ["planning", ["职业规划", "未来三年"]],
  ["role_knowledge", ["核心职责", "理解这个岗位"]],
  ["industry", ["行业", "发展变化", "行业趋势"]],
  ["questions", ["向面试官", "反问"]],
  ["feedback", ["负面反馈", "接受反馈"]],
  ["decision", ["信息不足", "做决定"]],
  ["ownership", ["额外责任", "主动承担"]],
  ["customer", ["用户需求", "客户需求"]],
  ["adapt", ["计划发生变化", "快速调整", "应对变化"]],
  ["resume_deep_dive", ["简历中", "简历里的"]],
  ["jd_alignment", ["岗位jd", "jd核心职责", "结合jd"]],
];

export type QuestionGenerationInput = {
  target: Target;
  existingIntents: string[];
  existingQuestions: string[];
};

type GeneratedQuestion = Pick<Question, "text" | "intent" | "category" | "reason" | "focus" | "core">;

export function normalizeQuestionGenerationInput(value: unknown): QuestionGenerationInput | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as { target?: Partial<Target>; existingIntents?: unknown; existingQuestions?: unknown };
  const target = input.target;
  if (!target || typeof target.id !== "string" || typeof target.industry !== "string"
    || typeof target.role !== "string" || typeof target.experience !== "string") return undefined;

  const id = normalize(target.id).slice(0, 200);
  const industry = normalize(target.industry).slice(0, 200);
  const role = normalize(target.role).slice(0, 200);
  const experience = normalize(target.experience).slice(0, 200);
  if (!id || !industry || !role || !experience) return undefined;

  return {
    target: {
      id,
      industry,
      role,
      experience,
      resume: typeof target.resume === "string" ? normalize(target.resume).slice(0, 20_000) : undefined,
      jd: typeof target.jd === "string" ? normalize(target.jd).slice(0, 20_000) : undefined,
      createdAt: typeof target.createdAt === "string" ? target.createdAt : new Date().toISOString(),
    },
    existingIntents: stringList(input.existingIntents, 300, 200),
    existingQuestions: stringList(input.existingQuestions, 300, 1_000),
  };
}

export function normalizeGeneratedQuestions(value: unknown, input: QuestionGenerationInput): Question[] {
  if (!value || typeof value !== "object") return [];
  const items = (value as { questions?: unknown }).questions;
  if (!Array.isArray(items)) return [];

  const existingIntents = new Set(input.existingIntents.map(compact));
  const existingQuestions = new Set(input.existingQuestions.map(compact));
  const seenIntents = new Set(existingIntents);
  const seenQuestions = new Set(existingQuestions);
  let coreCount = 0;

  return items.flatMap((value): Question[] => {
    const item = normalizeGeneratedQuestion(value);
    if (!item) return [];
    const intentKey = compact(item.intent);
    const questionKey = compact(item.text);
    if (!intentKey || !questionKey || seenIntents.has(intentKey) || seenQuestions.has(questionKey)) return [];
    seenIntents.add(intentKey);
    seenQuestions.add(questionKey);

    const core = item.core && coreCount < 7;
    if (core) coreCount += 1;
    return [{
      ...item,
      core,
      id: crypto.randomUUID(),
      targetId: input.target.id,
      status: "pending",
      source: "generated",
      createdAt: new Date().toISOString(),
    }];
  }).slice(0, 15);
}

function normalizeGeneratedQuestion(value: unknown): GeneratedQuestion | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Partial<GeneratedQuestion>;
  if (typeof item.text !== "string" || typeof item.intent !== "string" || typeof item.category !== "string"
    || typeof item.reason !== "string" || typeof item.focus !== "string") return undefined;

  const text = normalize(item.text).slice(0, 1_000);
  const inferredIntent = inferKnownIntent(text);
  const normalized = {
    text,
    intent: inferredIntent || normalize(item.intent).slice(0, 200),
    category: normalize(item.category).slice(0, 100),
    reason: normalize(item.reason).slice(0, 500),
    focus: normalize(item.focus).slice(0, 500),
    core: item.core === true,
  };
  return Object.values(normalized).some((item) => typeof item === "string" && !item) ? undefined : normalized;
}

function stringList(value: unknown, limit: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string")
    .map((item) => normalize(item).slice(0, maxLength))
    .filter(Boolean)
    .slice(0, limit);
}

function normalize(value: string) {
  return value.replace(/\0/g, "").replace(/[^\S\r\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function compact(value: string) {
  return normalize(value).toLowerCase().replace(/[\s，。！？、,.!?：:；;（）()“”"'《》_-]/g, "");
}

function inferKnownIntent(text: string) {
  const normalized = compact(text);
  return intentKeywords.find(([, keywords]) => keywords.some((keyword) => normalized.includes(compact(keyword))))?.[0] ?? "";
}
