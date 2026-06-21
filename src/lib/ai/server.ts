import "server-only";

type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIWorkload = "fast" | "quality";
type AIProvider = "deepseek" | "openai" | "openai-compatible" | "custom";

type AIRequestOptions = {
  maxTokens?: number;
};

function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.trim();
  if (provider === "openai" || provider === "openai-compatible" || provider === "custom") return provider;
  return "deepseek";
}

export function getAIStatus() {
  const provider = getAIProvider();
  const configured = Boolean(
    process.env.AI_API_KEY
    && process.env.AI_API_BASE_URL
    && process.env.AI_MODEL_FAST
    && process.env.AI_MODEL_QUALITY,
  );
  return {
    configured,
    provider: configured ? provider : undefined,
    models: configured ? {
      fast: process.env.AI_MODEL_FAST,
      quality: process.env.AI_MODEL_QUALITY,
    } : undefined,
    mode: configured ? "remote" : "local-demo",
  };
}

export async function callStructuredAI<T>(messages: AIMessage[], workload: AIWorkload = "quality", options: AIRequestOptions = {}): Promise<T> {
  const { configured, provider } = getAIStatus();
  if (!configured) {
    throw new Error("AI service is not configured");
  }

  const model = workload === "fast" ? process.env.AI_MODEL_FAST : process.env.AI_MODEL_QUALITY;
  const body: Record<string, unknown> = {
    model,
    messages,
    response_format: { type: "json_object" },
    max_tokens: options.maxTokens ?? 1_200,
    temperature: 0.2,
  };
  if (provider === "deepseek") body.thinking = { type: "disabled" };

  let response: Response;
  try {
    response = await fetch(`${process.env.AI_API_BASE_URL!.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error("AI service request failed");
  }

  if (!response.ok) {
    throw new Error("AI service request failed");
  }

  const result = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI response did not contain structured content");
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error("AI service returned invalid structured content");
  }
}
