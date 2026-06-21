import { NextResponse } from "next/server";
import { callStructuredAI, getAIStatus } from "@/lib/ai/server";
import { normalizeEvaluationInput, normalizeEvaluationResult } from "@/lib/ai/answer-evaluation";
import { evaluateAnswer } from "@/lib/demo-ai";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 64 * 1024) return errorResponse("提交内容过长，请缩短回答后重试。", 413);

    const input = normalizeEvaluationInput(await request.json());
    if (!input) return errorResponse("请先填写有效回答，再获得 AI 辅导。", 400);

    if (!getAIStatus().configured) {
      return NextResponse.json({
        ...evaluateAnswer(input.answer, {
          text: input.question,
          intent: input.intent ?? "",
          category: input.category ?? "",
          focus: input.focus ?? "",
        }),
        mode: "local-demo",
        notice: "远程 AI 未配置，当前显示本地规则评价。",
      });
    }

    try {
      const raw = await callStructuredAI<unknown>(createMessages(input), "quality");
      let result = normalizeEvaluationResult(raw);
      if (!result) {
        const repaired = await callStructuredAI<unknown>(createRepairMessages(raw), "quality");
        result = normalizeEvaluationResult(repaired);
      }
      if (!result) {
        return NextResponse.json({
          ...createLocalEvaluation(input),
          mode: "local-demo",
          notice: "远程模型返回的辅导结构不完整，已自动改用本地规则完成本次辅导。",
        });
      }

      return NextResponse.json({
        ...result,
        mode: "remote",
        notice: "远程 AI 已按当前题型完成评价与辅导。",
      });
    } catch {
      // Do not log user answers, model inputs, outputs, or upstream error bodies.
      return errorResponse("远程 AI 辅导失败，你的回答草稿已保存，请稍后重试。", 502);
    }
  } catch {
    return errorResponse("AI 辅导失败，你的回答草稿已保存，请稍后重试。", 422);
  }
}

function createLocalEvaluation(input: NonNullable<ReturnType<typeof normalizeEvaluationInput>>) {
  return evaluateAnswer(input.answer, {
    text: input.question,
    intent: input.intent ?? "",
    category: input.category ?? "",
    focus: input.focus ?? "",
  });
}

function createMessages(input: ReturnType<typeof normalizeEvaluationInput> & {}) {
  return [
    {
      role: "system" as const,
      content: [
        "你是严谨、具体的面试回答教练。请评价用户回答，并提供改进建议。",
        "不得虚构或推断用户未提供的个人经历、职责、成果或数据。",
        "不得展示总分。rating 和每个维度 rating 只能是：表现优秀、基本达标、需要加强、信息不足。",
        "所有题型使用内容相关性、表达清晰度、回答完整度三个基础维度。",
        "行为经历题增加经历具体程度、个人行动与判断、结果与复盘。",
        "求职动机与个人定位题增加动机真实性与具体性、岗位关联。",
        "岗位或行业认知题增加观点与理解深度、岗位或行业关联，不要求项目数据。",
        "方法与情景题增加方法与判断标准、可执行性，不要求过往项目数据。",
        "信息不足时全部列入 informationGaps。当前 MVP 不进行追问，不得返回 followUp 或任何追问字段。",
        "dimensions 至少返回内容相关性、表达清晰度、回答完整度三个基础维度；outline 和 keywords 各至少返回一项。",
        "严格只返回以下 JSON 结构，不要增加字段：",
        "{\"rating\":\"需要加强\",\"dimensions\":[{\"dimension\":\"内容相关性\",\"rating\":\"基本达标\",\"feedback\":\"具体反馈\"},{\"dimension\":\"表达清晰度\",\"rating\":\"基本达标\",\"feedback\":\"具体反馈\"},{\"dimension\":\"回答完整度\",\"rating\":\"需要加强\",\"feedback\":\"具体反馈\"}],\"informationGaps\":[\"信息缺口\"],\"outline\":[\"回答结构\"],\"keywords\":[\"关键词\"],\"improvement\":\"具体改进建议\"}",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify(input),
    },
  ];
}

function createRepairMessages(raw: unknown) {
  return [
    {
      role: "system" as const,
      content: [
        "只修正输入内容的 JSON 字段和数据类型，不改变评价含义，不新增事实。",
        "rating 和每个维度 rating 只能是：表现优秀、基本达标、需要加强、信息不足。",
        "dimensions 至少保留或补齐内容相关性、表达清晰度、回答完整度三个基础维度；outline 和 keywords 各至少返回一项。",
        "严格返回：rating, dimensions[{dimension,rating,feedback}], informationGaps, outline, keywords, improvement。不得返回 followUp 或任何追问字段。",
        "只返回 JSON。",
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: JSON.stringify(raw),
    },
  ];
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
