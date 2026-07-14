import "server-only";
import OpenAI from "openai";
import { getLlm } from "@/lib/llm";
import {
  LLMRateLimited,
  LLMUnavailable,
  type ChatMessage,
  type CompleteOptions,
  type LLMProvider,
  type LLMResponse,
} from "../interfaces";

// Wraps the existing OpenAI client (lib/llm.ts owns the singleton + API key
// guard) — behavior for callers migrated here is unchanged from a direct
// `getLlm().chat.completions.create()` call; this is a normalization layer,
// not a new client.

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai";

  async complete(opts: CompleteOptions): Promise<LLMResponse> {
    const client = getLlm();
    try {
      const resp = await client.chat.completions.create({
        model: opts.model,
        messages: opts.messages as OpenAI.Chat.ChatCompletionMessageParam[],
        max_tokens: opts.maxTokens,
        temperature: opts.temperature,
        ...(opts.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      });
      const text = resp.choices[0]?.message?.content?.trim() ?? "";
      return {
        text,
        usage: {
          tokensIn: resp.usage?.prompt_tokens ?? 0,
          tokensOut: resp.usage?.completion_tokens ?? 0,
        },
        provider: this.name,
      };
    } catch (e) {
      if (e instanceof OpenAI.APIError) {
        if (e.status === 429) throw new LLMRateLimited(e.message);
        if (typeof e.status === "number" && e.status >= 500) {
          throw new LLMUnavailable(e.message);
        }
      }
      throw e;
    }
  }
}

export type { ChatMessage };
