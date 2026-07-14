import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import {
  LLMRateLimited,
  LLMUnavailable,
  type CompleteOptions,
  type LLMProvider,
  type LLMResponse,
} from "../interfaces";

// [Not verified] against the live Anthropic API in this codebase (no key
// configured here) — structurally correct against the SDK's types, same
// normalization contract as OpenAIProvider. No response_format equivalent
// exists on Anthropic's API for jsonMode; enforcement is prompt-only there
// (Shadow's classify SYSTEM_PROMPT already carries a "Return JSON only"
// instruction independent of OpenAI's json_object mode, so this degrades
// gracefully rather than silently — see DECISIONS/011).

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY missing. Guard callers before building this provider.");
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";

  async complete(opts: CompleteOptions): Promise<LLMResponse> {
    const system = opts.messages.find((m) => m.role === "system")?.content;
    const turns = opts.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    try {
      const resp = await client().messages.create({
        model: opts.model,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature,
        system,
        messages: turns,
      });
      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      return {
        text,
        usage: {
          tokensIn: resp.usage.input_tokens,
          tokensOut: resp.usage.output_tokens,
        },
        provider: this.name,
      };
    } catch (e) {
      if (e instanceof Anthropic.APIError) {
        if (e.status === 429) throw new LLMRateLimited(e.message);
        if (typeof e.status === "number" && e.status >= 500) {
          throw new LLMUnavailable(e.message);
        }
      }
      throw e;
    }
  }
}
