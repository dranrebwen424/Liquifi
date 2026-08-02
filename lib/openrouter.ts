// Server-only OpenRouter API client. Never import this from client components —
// it reads OPENROUTER_API_KEY from the server environment.

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export class OpenRouterError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
  }
}

type ChatMessage = {
  role: "system" | "user";
  content: string | Array<Record<string, unknown>>;
};

export async function chatCompletion(opts: {
  model: string;
  messages: ChatMessage[];
  responseFormat?: { type: "json_object" };
}): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new OpenRouterError("OPENROUTER_API_KEY is not set");
  }

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      ...(opts.responseFormat ? { response_format: opts.responseFormat } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new OpenRouterError(`OpenRouter ${res.status}: ${detail.slice(0, 300)}`, res.status);
  }

  const json: unknown = await res.json();
  const content = (json as { choices?: { message?: { content?: unknown } }[] })
    ?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new OpenRouterError("OpenRouter returned no message content");
  }
  return content;
}
