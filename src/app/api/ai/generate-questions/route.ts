import { NextResponse } from "next/server";
import { callStructuredAI, getAIStatus } from "@/lib/ai/server";
import { normalizeGeneratedQuestions, normalizeQuestionGenerationInput } from "@/lib/ai/question-generation";
import { generateQuestions } from "@/lib/demo-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 128 * 1024) return errorResponse("求职目标资料过长，请精简简历或岗位 JD 后重试。", 413);

    const input = normalizeQuestionGenerationInput(await request.json());
    if (!input) return errorResponse("请提供有效的求职目标后重试。", 400);

    if (!getAIStatus().configured) return localQuestions(input, "远程 AI 未配置，已使用本地规则生成题目。");

    try {
      const raw = await callStructuredAI<unknown>(createMessages(input), "fast", { maxTokens: 4_000 });
      const questions = normalizeGeneratedQuestions(raw, input);
      if (!questions.length) return localQuestions(input, "远程模型暂未生成有效新题，已使用本地规则补充。");
      return NextResponse.json({
        questions,
        mode: "remote",
        notice: `远程 AI 已生成 ${questions.length} 道新题。`,
      });
    } catch {
      return localQuestions(input, "远程模型题目生成暂不可用，已使用本地规则继续生成。");
    }
  } catch {
    return errorResponse("生成题目失败，请稍后重试。", 422);
  }
}

function localQuestions(input: NonNullable<ReturnType<typeof normalizeQuestionGenerationInput>>, notice: string) {
  const questions = generateQuestions(input.target, new Set(input.existingIntents));
  return NextResponse.json({ questions, mode: "local-demo", notice });
}

function createMessages(input: NonNullable<ReturnType<typeof normalizeQuestionGenerationInput>>) {
  return [
    {
      role: "system" as const,
      content: [
        "你是面试题目生成 Agent。根据求职目标生成具有针对性的中文面试题。",
        "最多生成 15 道新题，最多 7 道标记 core=true。高频核心职责、简历和 JD 高相关题优先标记为核心题。",
        "覆盖通用面试、行为经历、岗位能力、专业知识、行业认知；只有提供简历或 JD 时才能生成对应针对题。",
        "不得虚构或断言候选人拥有未提供的经历、职责、成果或数据。简历针对题应要求候选人基于真实内容作答。",
        "existingIntents 和 existingQuestions 中已有或语义相同的问题不得再次生成；新题之间也不得重复。",
        "intent 使用简洁稳定的 snake_case 考察意图标签。reason 说明推荐原因，不展示出现概率。focus 说明回答重点。",
        "严格只返回 JSON：{\"questions\":[{\"text\":\"题目\",\"intent\":\"stable_intent\",\"category\":\"分类\",\"reason\":\"推荐原因\",\"focus\":\"考察重点\",\"core\":true}]}。",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify({
        targetIndustry: input.target.industry,
        targetRole: input.target.role,
        experience: input.target.experience,
        resume: input.target.resume,
        jobDescription: input.target.jd,
        existingIntents: input.existingIntents,
        existingQuestions: input.existingQuestions,
      }),
    },
  ];
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
