import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const openaiCreate = vi.fn();
vi.mock("@/lib/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/llm")>();
  return {
    ...actual,
    getLlm: () => ({ chat: { completions: { create: openaiCreate } } }),
  };
});

const anthropicCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  class FakeAnthropic extends actual.default {
    messages = { create: anthropicCreate } as unknown as Anthropic["messages"];
  }
  return { ...actual, default: FakeAnthropic };
});

// Imported after the mocks above so both pick up the faked clients.
const { OpenAIProvider } = await import("@/lib/llm-provider/providers/openai");
const { AnthropicProvider } = await import("@/lib/llm-provider/providers/anthropic");
const { LLMRateLimited, LLMUnavailable } = await import("@/lib/llm-provider/interfaces");
const {
  buildProvider,
  getConfiguredProviderName,
  resolveModel,
} = await import("@/lib/llm-provider");

const msgs = [{ role: "user" as const, content: "hello" }];

describe("OpenAIProvider.complete", () => {
  beforeEach(() => {
    openaiCreate.mockReset();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("normalizes text + usage from the OpenAI response shape", async () => {
    openaiCreate.mockResolvedValue({
      choices: [{ message: { content: " hi there " } }],
      usage: { prompt_tokens: 10, completion_tokens: 4 },
    });
    const resp = await new OpenAIProvider().complete({ model: "gpt-4o-mini", messages: msgs });
    expect(resp.text).toBe("hi there");
    expect(resp.usage).toEqual({ tokensIn: 10, tokensOut: 4 });
    expect(resp.provider).toBe("openai");
  });

  it("passes jsonMode through as response_format", async () => {
    openaiCreate.mockResolvedValue({
      choices: [{ message: { content: "{}" } }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    });
    await new OpenAIProvider().complete({ model: "gpt-4o-mini", messages: msgs, jsonMode: true });
    expect(openaiCreate).toHaveBeenCalledWith(
      expect.objectContaining({ response_format: { type: "json_object" } }),
    );
  });

  it("normalizes a 429 to LLMRateLimited", async () => {
    openaiCreate.mockRejectedValue(new OpenAI.APIError(429, {}, "slow down", new Headers()));
    await expect(
      new OpenAIProvider().complete({ model: "gpt-4o-mini", messages: msgs }),
    ).rejects.toBeInstanceOf(LLMRateLimited);
  });

  it("normalizes a 5xx to LLMUnavailable", async () => {
    openaiCreate.mockRejectedValue(new OpenAI.APIError(503, {}, "down", new Headers()));
    await expect(
      new OpenAIProvider().complete({ model: "gpt-4o-mini", messages: msgs }),
    ).rejects.toBeInstanceOf(LLMUnavailable);
  });
});

describe("AnthropicProvider.complete", () => {
  beforeEach(() => {
    anthropicCreate.mockReset();
    process.env.ANTHROPIC_API_KEY = "test-key";
  });

  it("normalizes text + usage from the Anthropic response shape", async () => {
    anthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "hi there" }],
      usage: { input_tokens: 12, output_tokens: 6 },
    });
    const resp = await new AnthropicProvider().complete({ model: "claude-3-5-haiku-latest", messages: msgs });
    expect(resp.text).toBe("hi there");
    expect(resp.usage).toEqual({ tokensIn: 12, tokensOut: 6 });
    expect(resp.provider).toBe("anthropic");
  });

  it("normalizes a 429 to LLMRateLimited (same neutral shape as OpenAI)", async () => {
    anthropicCreate.mockRejectedValue(new Anthropic.APIError(429, {}, "overloaded", new Headers()));
    await expect(
      new AnthropicProvider().complete({ model: "claude-3-5-haiku-latest", messages: msgs }),
    ).rejects.toBeInstanceOf(LLMRateLimited);
  });
});

describe("provider config swap", () => {
  const ORIGINAL_ENV = process.env.LLM_PROVIDER;
  afterEach(() => {
    process.env.LLM_PROVIDER = ORIGINAL_ENV;
  });

  it("defaults to openai when LLM_PROVIDER is unset", () => {
    delete process.env.LLM_PROVIDER;
    expect(getConfiguredProviderName()).toBe("openai");
  });

  it("respects LLM_PROVIDER=anthropic", () => {
    process.env.LLM_PROVIDER = "anthropic";
    expect(getConfiguredProviderName()).toBe("anthropic");
  });

  it("buildProvider returns the matching adapter for each name — no caller branching needed", () => {
    expect(buildProvider("openai")).toBeInstanceOf(OpenAIProvider);
    expect(buildProvider("anthropic")).toBeInstanceOf(AnthropicProvider);
  });

  it("resolveModel routes to a different, provider-appropriate model for the same task", () => {
    const openaiModel = resolveModel("classify", "openai");
    const anthropicModel = resolveModel("classify", "anthropic");
    expect(openaiModel).not.toBe(anthropicModel);
    expect(openaiModel).toMatch(/^gpt-/);
    expect(anthropicModel).toMatch(/^claude-/);
  });
});
