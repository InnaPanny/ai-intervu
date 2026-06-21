import { NextResponse } from "next/server";
import { callStructuredAI, getAIStatus } from "@/lib/ai/server";
import {
  createLocalSafeReference,
  createResumeGroundedSafeReference,
  hasUnsupportedNumbers,
  isSubstantiveReference,
  normalizeReferenceInput,
  referenceProfile,
  requiresPersonalFactVerification,
  type ReferenceAnswerInput,
} from "@/lib/ai/reference-answer";

export const runtime = "nodejs";

type RemoteReferenceAnswer = {
  referenceAnswer?: string;
};

type FactVerification = {
  unsupportedClaims?: string[];
};

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 128 * 1024) return errorResponse("提交内容过长，请精简简历、岗位 JD 或回答后重试。", 413);

    const input = normalizeReferenceInput(await request.json());
    if (!input) return errorResponse("请提供有效的面试问题后重试。", 400);
    const profile = referenceProfile(input.intent);
    if (!input.answer && !input.resume && (profile === "experience" || profile === "personal")) {
      return errorResponse("该问题涉及个人经历或动机，请先填写真实回答或补充简历，再生成 AI 参考应答。", 400);
    }

    if (!getAIStatus().configured) {
      if (!input.answer) return errorResponse("远程 AI 未配置，暂时无法从问题生成参考应答。", 503);
      return NextResponse.json(createLocalSafeReference(input));
    }

    try {
      let referenceAnswer = await generateReference(input);
      if (!referenceAnswer || !isSubstantiveReference(referenceAnswer, input.answer)) {
        if (requiresPersonalFactVerification(input.intent)) return safetyFallback(input);
        return errorResponse("AI 返回内容与原回答过于相似，请重新生成。", 422);
      }

      if (requiresPersonalFactVerification(input.intent)) {
        let unsupportedClaims = await verifyPersonalFacts(input, referenceAnswer);
        if (unsupportedClaims.length) {
          referenceAnswer = await generateReference(input, unsupportedClaims);
          unsupportedClaims = await verifyPersonalFacts(input, referenceAnswer);
        }
        if (!referenceAnswer || !isSubstantiveReference(referenceAnswer, input.answer) || unsupportedClaims.length) {
          return safetyFallback(input);
        }
      }

      return NextResponse.json({
        referenceAnswer,
        mode: "remote",
        notice: "远程 AI 已生成新的参考应答。请检查其中的观点与事实，编辑后再确认保存。",
      });
    } catch {
      // Do not log model inputs, outputs, upstream responses, or errors containing personal information.
      return errorResponse("远程 AI 调用失败，请稍后重新生成。", 502);
    }
  } catch {
    return errorResponse("生成参考应答失败，请稍后重试。", 422);
  }
}

function safetyFallback(input: ReferenceAnswerInput) {
  return NextResponse.json({
    ...(input.resume ? createResumeGroundedSafeReference(input) : createLocalSafeReference(input)),
    notice: input.resume
      ? "AI 扩写包含无法确认的细节，已自动改为基于简历明确事实的安全版本。请检查并编辑后再确认保存。"
      : "AI 扩写包含无法确认的个人事实，已自动改为安全整理版本。请补充更多真实信息后重新生成，以获得更完整的参考应答。",
  });
}

async function generateReference(input: ReferenceAnswerInput, rejectedClaims: string[] = []) {
  const result = await callStructuredAI<RemoteReferenceAnswer>(createMessages(input, rejectedClaims), "quality");
  return result.referenceAnswer?.trim().slice(0, 20_000) ?? "";
}

async function verifyPersonalFacts(input: ReferenceAnswerInput, referenceAnswer: string) {
  const sourceText = [input.question, input.answer, input.role, input.industry, input.resume, input.jd].filter(Boolean).join("\n");
  if (hasUnsupportedNumbers(referenceAnswer, sourceText)) return ["参考应答包含输入中不存在的数字。"];
  const result = await callStructuredAI<FactVerification>(createVerificationMessages(input, referenceAnswer), "quality");
  const unsupportedClaims = Array.isArray(result.unsupportedClaims)
    ? result.unsupportedClaims.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 10)
    : ["事实核验结果无效。"];
  if (unsupportedClaims.length) return unsupportedClaims;
  const strictResult = await callStructuredAI<FactVerification>(createStrictVerificationMessages(input, referenceAnswer), "quality");
  return Array.isArray(strictResult.unsupportedClaims)
    ? strictResult.unsupportedClaims.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 10)
    : ["严格事实核验结果无效。"];
}

function createMessages(input: ReferenceAnswerInput, rejectedClaims: string[]) {
  const context = {
    question: input.question,
    userAnswer: input.answer,
    targetRole: input.role,
    targetIndustry: input.industry,
    resumeFacts: input.resume,
    jobDescription: input.jd,
    questionIntent: input.intent,
    questionCategory: input.category,
    evaluationFocus: input.focus,
    answerProfile: referenceProfile(input.intent),
    knownInformationGaps: input.informationGaps ?? [],
    rejectedUnsupportedClaims: rejectedClaims,
  };

  return [
    {
      role: "system" as const,
      content: [
        "你是专业的面试回答 Agent。请生成一段明显优于用户原回答、可在真实面试中直接口述的中文参考应答，不能只是改写或复述原回答。",
        "对于 method、knowledge、general 类型：运用专业知识补充通用框架、步骤、判断标准、取舍和验证方式；这些内容可以超出用户原回答，但不得声称是用户过去亲自做过的经历或成果。",
        "对于 experience、personal 类型：只使用 userAnswer 和 resumeFacts 中明确提供的个人事实；可以从简历中选择与问题最相关的真实经历，优化结构和表达，但不得虚构或推断经历、职责、行动、成果、数据、公司、项目、动机或具体例子。",
        "不得为简历事实补写看似合理但来源中未明确出现的背景问题、原因、影响、协作对象、实施步骤、功能方案或复盘结论。",
        "jobDescription 只用于理解目标岗位要求，不能作为用户个人经历或成果的事实来源。",
        "knownInformationGaps 来自用户本次回答；若某项缺口能由 resumeFacts 明确补足，可以使用对应简历事实。不得把 resumeFacts 中也不存在的缺失信息，或 rejectedUnsupportedClaims，写成已经发生的个人事实。",
        "不得编造个人业绩数字。信息不足时，只基于已有信息给出较简洁的安全版本，不要为了满足长度要求补充事实，也不要使用方括号占位符。",
        "对于 experience、personal 类型，事实安全优先于篇幅；简历和回答信息较少时，允许只生成 100 至 250 个中文字符，并尽量贴近来源事实。",
        "对于 method、knowledge、general 类型，参考应答建议为 250 至 450 个中文字符。所有回答都应自然、具体、简洁，并直接回应面试问题。",
        "只返回 JSON：{\"referenceAnswer\":\"...\"}。",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify(context),
    },
  ];
}

function createVerificationMessages(input: ReferenceAnswerInput, referenceAnswer: string) {
  return [
    {
      role: "system" as const,
      content: [
        "你是独立的个人事实核验器。比较用户已提供的事实与候选参考应答。",
        "候选回答中凡是声称用户亲自经历、负责、执行、选择、相信、获得结果，或出现具体公司、项目、场景、行为、成果和数据，但无法从用户回答或简历事实直接确认的内容，都列入 unsupportedClaims。",
        "允许候选回答对用户回答和简历中的明确事实进行同义改写、顺序调整和结构化组合；只要核心事实能直接对应来源，就不要列为 unsupportedClaims。",
        "只列出候选回答真正新增的具体事实，不要把表达润色、总结性评价、面试回答衔接语或合理的第一人称改写视为新增事实。",
        "不得允许看似合理的细节扩写。例如来源只写“协调研发上线”，则新增客服团队、具体功能方案、项目背景、问题原因或业务影响都属于 unsupportedClaims。",
        "来源只写结果变化时，可以复述该结果，但不得自行解释为什么变化、对客户或业务产生了什么影响。",
        "岗位 JD 只用于理解岗位要求，不能证明用户拥有某项经历、职责或成果。",
        "目标岗位、目标行业、通用表达结构和不声称用户做过的通用方法不属于个人事实。",
        "不得因为候选回答听起来合理就推断为真实。只返回 JSON：{\"unsupportedClaims\":[]}。",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        question: input.question,
        userAnswer: input.answer,
        resumeFacts: input.resume,
        jobDescription: input.jd,
        targetRole: input.role,
        targetIndustry: input.industry,
        candidateReferenceAnswer: referenceAnswer,
      }),
    },
  ];
}

function createStrictVerificationMessages(input: ReferenceAnswerInput, referenceAnswer: string) {
  return [
    {
      role: "system" as const,
      content: [
        "你是对抗式个人事实审计器。你的任务是找出候选参考应答中所有无法逐项对应来源的具体主张，而不是判断内容是否合理。",
        "只允许来源：userAnswer 和 resumeFacts。jobDescription、常识和合理推断均不能证明用户事实。",
        "逐项审计候选回答中的背景、原因、问题、角色、协作对象、行动、方案、功能、结果、影响、能力结论和复盘。",
        "例如来源只写“负责平台改版，协调研发上线，将时长从 5 天缩短至 3 天”，则新增“优化系统功能”“提升响应效率”“改善客户体验”“协调客服团队”都必须列入 unsupportedClaims。",
        "表达衔接语可以保留；任何具体内容无法在来源中直接找到对应依据时，必须列出。只返回 JSON：{\"unsupportedClaims\":[]}。",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        userAnswer: input.answer,
        resumeFacts: input.resume,
        jobDescription: input.jd,
        candidateReferenceAnswer: referenceAnswer,
      }),
    },
  ];
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
