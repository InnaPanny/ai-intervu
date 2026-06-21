import type { DimensionEvaluation, EvaluationRating, Question, Target } from "@/lib/types";

const templates = [
  ["self_intro", "请做一个与目标岗位相关的自我介绍。", "通用必问", "目标岗位的高频开场题", "快速建立岗位匹配印象"],
  ["motivation", "为什么选择应聘这个岗位？", "求职动机", "用于判断求职动机与岗位理解", "结合真实经历说明选择原因"],
  ["strength", "你认为自己最适合这个岗位的优势是什么？", "岗位匹配", "用于判断核心优势与岗位要求是否匹配", "用真实案例证明优势"],
  ["challenge", "请介绍一次你解决复杂问题的经历。", "行为面试", "用于考察分析与解决问题的能力", "讲清背景、行动和结果"],
  ["collaboration", "请介绍一次跨团队协作的经历。", "行为面试", "多数岗位都需要协作能力", "说明个人贡献与沟通方式"],
  ["failure", "请介绍一次没有达到预期的经历，你如何处理？", "行为面试", "用于考察复盘与成长能力", "诚实说明问题与改进"],
  ["priority", "当多个任务同时紧急时，你会如何安排优先级？", "岗位能力", "用于考察工作方法与判断力", "说明可执行的判断标准"],
  ["learning", "你如何快速学习一个陌生领域？", "成长能力", "用于考察学习方式与适应能力", "结合真实学习经历"],
  ["conflict", "你如何处理与同事意见不一致的情况？", "行为面试", "用于考察沟通与冲突处理", "避免空泛，说明具体做法"],
  ["achievement", "请介绍一项最能代表你能力的成果。", "经历深挖", "用于验证能力与成果真实性", "明确个人贡献，避免虚构数据"],
  ["pressure", "请介绍一次你在压力下完成任务的经历。", "行为面试", "用于考察压力管理与执行力", "说明如何拆解并推进任务"],
  ["planning", "你未来三年的职业规划是什么？", "职业规划", "用于判断岗位稳定性与成长方向", "与当前岗位形成合理联系"],
  ["role_knowledge", "你如何理解目标岗位的核心职责？", "岗位认知", "用于判断岗位理解深度", "结合岗位要求而非泛泛而谈"],
  ["industry", "你如何看待目标行业当前的发展变化？", "行业认知", "用于判断行业关注与思考能力", "给出有依据的个人判断"],
  ["questions", "面试结束时，你会向面试官了解哪些问题？", "通用必问", "用于判断求职关注点与准备程度", "提出有价值且真实关心的问题"],
  ["feedback", "请介绍一次你接受负面反馈并改进的经历。", "成长能力", "用于考察开放度与改进能力", "说明反馈后的实际行动"],
  ["decision", "请介绍一次你需要在信息不足时做决定的经历。", "岗位能力", "用于考察判断与风险意识", "说明依据、取舍和复盘"],
  ["ownership", "请介绍一次你主动承担额外责任的经历。", "经历深挖", "用于考察主动性与责任感", "区分团队成果和个人贡献"],
  ["customer", "你如何理解并验证用户或客户的真实需求？", "岗位能力", "适用于需要理解用户的岗位", "说明真实方法与判断依据"],
  ["adapt", "请介绍一次计划发生变化后你快速调整的经历。", "行为面试", "用于考察适应能力", "说明变化、应对和结果"],
];

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

export function inferQuestionIntent(text: string) {
  const normalized = text.toLowerCase().replace(/[\s，。！？、,.!?]/g, "");
  const matched = intentKeywords.find(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)));
  return matched?.[0] ?? `custom:${normalized}`;
}

export function generateQuestions(target: Target, existingIntents: Set<string>) {
  const contextualTemplates: string[][] = [];
  if (target.resume?.trim()) {
    contextualTemplates.push([
      "resume_deep_dive",
      "请从你提供的简历中选择一段最相关的经历，说明它如何证明你适合目标岗位。",
      "简历深挖",
      "针对你已提供的简历内容",
      "只使用简历中的真实经历，说明个人贡献与岗位匹配",
    ]);
  }
  if (target.jd?.trim()) {
    contextualTemplates.push([
      "jd_alignment",
      "结合你提供的岗位 JD，哪项职责与你的真实经历最匹配？",
      "JD 针对题",
      "与已提供的岗位 JD 核心职责相关",
      "基于真实经历说明匹配点，不补充未提供的成果或数据",
    ]);
  }

  const available = [...contextualTemplates, ...templates].filter(([intent]) => !existingIntents.has(intent));
  return available.slice(0, 15).map(([intent, text, category, reason, focus], index) => ({
    id: crypto.randomUUID(),
    targetId: target.id,
    text: text.replace("目标岗位", target.role),
    intent,
    category,
    reason: `${reason}，结合当前目标：${target.role}`,
    focus,
    core: index < 7,
    status: "pending",
    source: "generated",
    createdAt: new Date().toISOString(),
  })) satisfies Question[];
}

type EvaluationContext = Pick<Question, "intent" | "category" | "focus" | "text">;
type EvaluationProfile = "experience" | "motivation" | "knowledge" | "method" | "general";

export function evaluateAnswer(answer: string, context?: EvaluationContext) {
  const length = answer.trim().length;
  const profile = evaluationProfile(context?.intent);
  const hasPersonalContribution = /我|本人|个人/.test(answer);
  const hasResult = /结果|最终|产出|完成|实现|反馈|数据|提升|降低|增加|减少/.test(answer);
  const hasReflection = /复盘|学到|经验|改进|反思|之后/.test(answer);
  const hasReasoning = /因为|原因|基于|判断|考虑|所以|因此|取舍|依据/.test(answer);
  const hasMethod = /首先|其次|然后|最后|步骤|方法|流程|优先|验证|分析/.test(answer);
  const hasRoleLink = /岗位|职责|能力|匹配|价值|业务|用户|行业/.test(answer);
  const hasSpecificity = /例如|比如|具体|当时|负责|参与|通过|采用/.test(answer);
  const informationGaps = informationGapsFor(profile, {
    length, hasPersonalContribution, hasResult, hasReasoning, hasMethod, hasRoleLink, hasSpecificity,
  });
  const dimensions = dimensionsFor(profile, {
    length, hasPersonalContribution, hasResult, hasReasoning, hasMethod, hasRoleLink, hasSpecificity,
  });
  const rating = overallRating(length, dimensions);
  const guidance = guidanceFor(profile);

  return {
    rating,
    dimensions,
    informationGaps,
    outline: guidance.outline,
    keywords: guidance.keywords,
    improvement:
      informationGaps.length
        ? guidance.improvement
        : hasReflection
          ? "回答已经具备基础结构和复盘，可进一步删减与岗位无关的信息。"
          : "回答已经覆盖当前题型的核心内容，可进一步精简表达并补充必要依据。",
    reference: `建议按当前题型的回答结构整理已有内容，不补充未确认的经历或数据。请在确认事实准确后，将内容改写成自己的最终答案。`,
  };
}

function dimension(dimension: string, rating: EvaluationRating, feedback: string): DimensionEvaluation {
  return { dimension, rating, feedback };
}

type AnswerSignals = {
  length: number;
  hasPersonalContribution: boolean;
  hasResult: boolean;
  hasReasoning: boolean;
  hasMethod: boolean;
  hasRoleLink: boolean;
  hasSpecificity: boolean;
};

function evaluationProfile(intent?: string): EvaluationProfile {
  if (["challenge", "collaboration", "failure", "conflict", "achievement", "pressure", "feedback", "decision", "ownership", "adapt", "resume_deep_dive", "jd_alignment"].includes(intent ?? "")) return "experience";
  if (["self_intro", "motivation", "strength", "planning"].includes(intent ?? "")) return "motivation";
  if (["role_knowledge", "industry", "questions"].includes(intent ?? "")) return "knowledge";
  if (["priority", "learning", "customer"].includes(intent ?? "")) return "method";
  return "general";
}

function commonDimensions(signals: AnswerSignals) {
  const enough = signals.length >= 45;
  return [
    dimension("内容相关性", signals.length < 15 ? "信息不足" : enough ? "基本达标" : "需要加强", signals.length < 15 ? "内容不足，暂时无法判断是否切题。" : "已围绕问题作答，可继续聚焦问题真正考察的内容。"),
    dimension("表达清晰度", enough ? "基本达标" : "需要加强", "建议先给出核心结论，再用少量必要信息展开。"),
    dimension("回答完整度", signals.length >= 90 ? "基本达标" : signals.length < 15 ? "信息不足" : "需要加强", "回答应覆盖当前题型的核心要点，而不是追求固定模板或篇幅。"),
  ];
}

function dimensionsFor(profile: EvaluationProfile, signals: AnswerSignals): DimensionEvaluation[] {
  const common = commonDimensions(signals);
  if (profile === "experience") return [
    ...common,
    dimension("经历具体程度", signals.hasSpecificity ? "基本达标" : "需要加强", "补充可由你确认的具体情境和关键行动，不必编造数据。"),
    dimension("个人行动与判断", signals.hasPersonalContribution && signals.hasReasoning ? "基本达标" : "需要加强", "说明你本人做了什么，以及为什么这样做。"),
    dimension("结果与复盘", signals.hasResult ? "基本达标" : "需要加强", "说明真实结果、反馈或经验总结；没有量化数据时无需编造。"),
  ];
  if (profile === "motivation") return [
    ...common,
    dimension("动机真实性与具体性", signals.hasSpecificity ? "基本达标" : "需要加强", "说明真实选择原因，避免只使用通用表态。"),
    dimension("岗位关联", signals.hasRoleLink ? "基本达标" : "需要加强", "说明你的方向、优势或规划与目标岗位之间的联系。"),
  ];
  if (profile === "knowledge") return [
    ...common,
    dimension("观点与理解深度", signals.hasReasoning ? "基本达标" : "需要加强", "给出核心观点，并说明判断依据或关键职责之间的关系。"),
    dimension("岗位或行业关联", signals.hasRoleLink ? "基本达标" : "需要加强", "围绕题目涉及的岗位、职责或行业展开，无需强行引用个人项目数据。"),
  ];
  if (profile === "method") return [
    ...common,
    dimension("方法与判断标准", signals.hasMethod || signals.hasReasoning ? "基本达标" : "需要加强", "说明处理步骤、优先级或判断标准。"),
    dimension("可执行性", signals.hasSpecificity ? "基本达标" : "需要加强", "补充如何落地或验证方法有效性，不要求必须提供以往项目数据。"),
  ];
  return [
    ...common,
    dimension("观点依据与具体性", signals.hasReasoning || signals.hasSpecificity ? "基本达标" : "需要加强", "补充必要的理由、例子或判断标准；只使用可确认的信息。"),
  ];
}

function informationGapsFor(profile: EvaluationProfile, signals: AnswerSignals) {
  const gaps = signals.length < 45 ? ["当前回答较短，尚未充分展开核心观点。"] : [];
  if (profile === "experience") {
    if (!signals.hasPersonalContribution) gaps.push("尚未明确说明你本人的具体行动或职责。");
    if (!signals.hasResult) gaps.push("尚未说明真实结果、反馈或经验总结；没有数据时无需编造。");
  } else if (profile === "motivation") {
    if (!signals.hasSpecificity) gaps.push("尚未说明具体且真实的选择原因。");
    if (!signals.hasRoleLink) gaps.push("尚未说明与目标岗位的具体关联。");
  } else if (profile === "knowledge") {
    if (!signals.hasReasoning) gaps.push("尚未说明核心观点的判断依据。");
  } else if (profile === "method") {
    if (!signals.hasMethod && !signals.hasReasoning) gaps.push("尚未说明处理步骤或判断标准。");
  } else if (!signals.hasReasoning && !signals.hasSpecificity) {
    gaps.push("尚未提供支撑观点的理由、例子或判断标准。");
  }
  return gaps;
}

function overallRating(length: number, dimensions: DimensionEvaluation[]): EvaluationRating {
  if (length < 15) return "信息不足";
  const achieved = dimensions.filter((item) => item.rating === "基本达标" || item.rating === "表现优秀").length;
  if (length >= 150 && achieved === dimensions.length) return "表现优秀";
  if (achieved >= Math.ceil(dimensions.length * 0.65)) return "基本达标";
  return "需要加强";
}

function guidanceFor(profile: EvaluationProfile) {
  if (profile === "experience") return {
    outline: ["说明真实情境与目标", "说明你的行动与判断", "总结真实结果与复盘"],
    keywords: ["情境", "目标", "行动", "判断", "结果与复盘"],
    improvement: "建议补充真实情境、你的关键行动与判断，以及可确认的结果或复盘。",
  };
  if (profile === "motivation") return {
    outline: ["直接说明核心选择", "解释真实原因", "联系目标岗位与未来方向"],
    keywords: ["选择", "真实原因", "优势", "岗位关联", "方向"],
    improvement: "建议说明具体且真实的原因，并建立与目标岗位的清晰联系。",
  };
  if (profile === "knowledge") return {
    outline: ["先给出核心观点", "说明关键职责或判断依据", "总结优先级与价值"],
    keywords: ["核心观点", "职责", "依据", "优先级", "价值"],
    improvement: "建议明确核心观点并说明判断依据，无需强行补充个人项目数据。",
  };
  if (profile === "method") return {
    outline: ["说明处理原则", "展开步骤与判断标准", "说明验证与调整方式"],
    keywords: ["原则", "步骤", "判断标准", "执行", "验证"],
    improvement: "建议补充具体步骤、判断标准和验证方式，不要求必须引用过往项目。",
  };
  return {
    outline: ["直接回应问题", "说明理由或依据", "补充必要例子或总结"],
    keywords: ["核心观点", "理由", "依据", "例子", "总结"],
    improvement: "建议直接回应问题，并补充支撑观点的理由、例子或判断标准。",
  };
}
