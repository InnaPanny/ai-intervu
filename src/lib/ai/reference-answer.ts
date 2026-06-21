export type ReferenceAnswerInput = {
  question: string;
  answer: string;
  role?: string;
  industry?: string;
  resume?: string;
  jd?: string;
  intent?: string;
  category?: string;
  focus?: string;
  informationGaps?: string[];
};

export type ReferenceAnswerResult = {
  referenceAnswer: string;
  mode: "remote" | "local-safe";
  notice: string;
};

export function createLocalSafeReference(input: ReferenceAnswerInput): ReferenceAnswerResult {
  const answer = normalize(input.answer);
  const gaps = (input.informationGaps ?? []).map(normalize).map((gap) => gap.replace(/[。；;]+$/, "")).filter(Boolean);
  const gapSummary = gaps.length
    ? `\n\n目前这段回答仍有信息需要补充：${gaps.join("；")}。在实际面试中，我会只补充自己能够确认的事实。`
    : "";

  return {
    referenceAnswer: `面试官您好。针对这个问题，我会结合自己的真实经历来回答。\n\n${answer}${gapSummary}`,
    mode: "local-safe",
    notice: "远程 AI 暂不可用，已基于你的原回答生成安全整理版本，未补充新事实。",
  };
}

export function createResumeGroundedSafeReference(input: ReferenceAnswerInput): ReferenceAnswerResult {
  const answer = normalize(input.answer);
  const evidence = resumeEvidence(input.resume ?? "", input.intent);
  const parts = [
    answer,
    evidence.length ? `根据简历中可确认的信息，我可以补充以下相关经历：${evidence.join("；")}。` : "",
  ].filter(Boolean);

  return {
    referenceAnswer: `面试官您好。针对这个问题，我会基于自己能够确认的信息回答。\n\n${parts.join("\n\n")}`,
    mode: "local-safe",
    notice: "AI 扩写包含无法确认的细节，已自动改为基于简历明确事实的安全版本。请检查并编辑后再确认保存。",
  };
}

export function hasUnsupportedNumbers(referenceAnswer: string, sourceText: string) {
  const sourceNumbers = new Set(extractNumbers(sourceText));
  return extractNumbers(referenceAnswer).some((value) => !sourceNumbers.has(value));
}

export function isSubstantiveReference(referenceAnswer: string, userAnswer: string) {
  const reference = compact(referenceAnswer);
  const answer = compact(userAnswer);
  if (!answer) return reference.length >= 80;
  if (reference.length < Math.max(80, answer.length * 1.25)) return false;
  if (reference === answer) return false;
  return !reference.includes(answer) || reference.length >= Math.max(120, answer.length * 2);
}

export function referenceProfile(intent?: string) {
  if (["challenge", "collaboration", "failure", "conflict", "achievement", "pressure", "feedback", "decision", "ownership", "adapt", "resume_deep_dive", "jd_alignment"].includes(intent ?? "")) return "experience";
  if (["self_intro", "motivation", "strength", "planning"].includes(intent ?? "")) return "personal";
  if (["role_knowledge", "industry", "questions"].includes(intent ?? "")) return "knowledge";
  if (["priority", "learning", "customer"].includes(intent ?? "")) return "method";
  return "general";
}

export function requiresPersonalFactVerification(intent?: string) {
  const profile = referenceProfile(intent);
  return profile === "experience" || profile === "personal";
}

export function normalizeReferenceInput(value: unknown): ReferenceAnswerInput | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as Partial<ReferenceAnswerInput>;
  if (typeof input.question !== "string" || (input.answer !== undefined && typeof input.answer !== "string")) return undefined;

  const question = normalize(input.question).slice(0, 1_000);
  const answer = normalize(input.answer ?? "").slice(0, 20_000);
  if (!question) return undefined;

  return {
    question,
    answer,
    role: typeof input.role === "string" ? normalize(input.role).slice(0, 200) : undefined,
    industry: typeof input.industry === "string" ? normalize(input.industry).slice(0, 200) : undefined,
    resume: typeof input.resume === "string" ? normalize(input.resume).slice(0, 20_000) : undefined,
    jd: typeof input.jd === "string" ? normalize(input.jd).slice(0, 10_000) : undefined,
    intent: typeof input.intent === "string" ? normalize(input.intent).slice(0, 200) : undefined,
    category: typeof input.category === "string" ? normalize(input.category).slice(0, 200) : undefined,
    focus: typeof input.focus === "string" ? normalize(input.focus).slice(0, 500) : undefined,
    informationGaps: Array.isArray(input.informationGaps)
      ? input.informationGaps.filter((item): item is string => typeof item === "string").slice(0, 10).map((item) => normalize(item).slice(0, 500))
      : [],
  };
}

function extractNumbers(value: string) {
  return value.match(/\d+(?:\.\d+)?%?/g) ?? [];
}

function normalize(value: string) {
  return value.replace(/\0/g, "").replace(/[^\S\r\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function compact(value: string) {
  return normalize(value).replace(/[\s，。！？、,.!?：:；;（）()“”"'《》]/g, "");
}

function resumeEvidence(resume: string, intent?: string) {
  const profile = referenceProfile(intent);
  const keywords = profile === "experience"
    ? ["负责", "项目", "推动", "协调", "完成", "上线", "优化", "提升", "降低", "结果", "成果"]
    : ["负责", "经验", "项目", "能力", "技能", "擅长", "推动", "完成", "成果"];

  return resume
    .split(/[\n。！？!?；;]+/)
    .map((item) => normalize(item))
    .filter((item) => item.length >= 8 && item.length <= 300 && !containsContactInformation(item))
    .map((item, index) => ({ item, index, score: keywords.filter((keyword) => item.includes(keyword)).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map(({ item }) => item);
}

function containsContactInformation(value: string) {
  return /(?:手机号|电话|邮箱|电子邮件|微信|地址|身份证|联系方式)|(?:1\d{10})|(?:[\w.+-]+@[\w.-]+\.[a-z]{2,})/i.test(value);
}
