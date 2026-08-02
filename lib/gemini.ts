// Server-only Google Gemini API client for receipt parsing (direct, not OpenRouter).
// Never import this from client components — it reads GOOGLE_GENERATIVE_AI_API_KEY.

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// ponytail: pinned stable flash-lite release (2.5 line is retired for new keys).
// Bump deliberately; the zod schema in agent/types.ts is the contract, not the model.
// 2026-08-01 benchmark vs 3.1: median 1,584ms vs 1,877ms (9 rounds each), accuracy 9/9 both,
// same tokens/parse; +$0.0004/parse on paid tier only (free tier $0 both).
export const GEMINI_MODEL = "gemini-3.5-flash-lite";

const TIMEOUT_MS = 120_000;
const MAX_OUTPUT_TOKENS = 1500;

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
  }
}

type ChatMessage = {
  role: "system" | "user";
  content: string | Array<Record<string, unknown>>;
};

function dataUrlToInlineData(dataUrl: string): { mimeType: string; data: string } {
  const match = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new GeminiError("Invalid data URL in image part");
  return { mimeType: match[1], data: match[2] };
}

/**
 * OpenAI-shaped completion over the Gemini API — accepts the same `messages`
 * shape used elsewhere (system + user with image_url parts) and maps it to
 * Gemini's generateContent. Returns the text of the first text part plus
 * token usage from the response.
 * @throws GeminiError on transport/auth errors and empty responses.
 */
export type GeminiUsage = { promptTokens: number; completionTokens: number };

export async function geminiChatCompletion(opts: {
  model: string;
  messages: ChatMessage[];
  responseFormat?: { type: "json_object" };
}): Promise<{ text: string; usage: GeminiUsage }> {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) {
    throw new GeminiError("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }

  const systemInstruction = opts.messages.find((m) => m.role === "system");
  const userContent = opts.messages.find((m) => m.role === "user");

  const parts: Array<Record<string, unknown>> = [];
  if (typeof userContent?.content === "string") {
    parts.push({ text: userContent.content });
  } else if (Array.isArray(userContent?.content)) {
    for (const part of userContent.content) {
      if (part.type === "image_url") {
        const url = String((part.image_url as { url?: unknown })?.url ?? "");
        const { mimeType, data } = dataUrlToInlineData(url);
        parts.push({ inline_data: { mime_type: mimeType, data } });
      } else if (part.type === "text") {
        parts.push({ text: part.text });
      }
    }
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseMimeType: opts.responseFormat ? "application/json" : "text/plain",
      temperature: 0,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  };
  if (systemInstruction) {
    const text = typeof systemInstruction.content === "string" ? systemInstruction.content : "";
    body.systemInstruction = { parts: [{ text }] };
  }

  const res = await fetch(`${GEMINI_BASE}/models/${opts.model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new GeminiError(`Gemini ${res.status}: ${detail.slice(0, 300)}`, res.status);
  }

  const json: unknown = await res.json();
  const partsOut = (json as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] })
    ?.candidates?.[0]?.content?.parts;
  const text = partsOut?.find((p) => typeof p.text === "string" && p.text.length > 0)?.text;
  if (typeof text !== "string") {
    throw new GeminiError("Gemini returned no message content");
  }
  const usage = (json as { usageMetadata?: { promptTokenCount?: unknown; candidatesTokenCount?: unknown } })
    ?.usageMetadata;
  return {
    text,
    usage: {
      promptTokens: Number(usage?.promptTokenCount ?? 0),
      completionTokens: Number(usage?.candidatesTokenCount ?? 0),
    },
  };
}
