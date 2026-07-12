import "server-only";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import type { LLMProvider } from "./interfaces";

export * from "./interfaces";

const PROVIDER_NAMES = ["openai", "anthropic"] as const;
export type ProviderName = (typeof PROVIDER_NAMES)[number];

/** Config-only swap (DECISIONS/011) — call sites never branch on provider name. */
export function buildProvider(name: ProviderName): LLMProvider {
  switch (name) {
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
  }
}

export function hasProvider(name: ProviderName): boolean {
  const key = name === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
  return Boolean(process.env[key]);
}

/** Reads LLM_PROVIDER (default "openai" — Shadow's only provider until now). */
export function getConfiguredProviderName(): ProviderName {
  const raw = process.env.LLM_PROVIDER;
  return raw === "anthropic" ? "anthropic" : "openai";
}

export function getConfiguredProvider(): LLMProvider {
  return buildProvider(getConfiguredProviderName());
}

// Per-provider model routing. OpenAI IDs match lib/llm.ts's existing MODELS
// table exactly (zero behavior change for the default provider). Anthropic
// uses rolling "-latest" aliases rather than a dated snapshot, overridable
// via env the same way the OpenAI models already are.
export type LlmTask = "classify" | "daily_report" | "area_scoring" | "rag_answer" | "labs_analysis";

const OPENAI_MODELS: Record<LlmTask, string> = {
  classify: process.env.OPENAI_CLASSIFY_MODEL || "gpt-4o-mini",
  daily_report: process.env.OPENAI_REPORT_MODEL || "gpt-4o",
  area_scoring: process.env.OPENAI_REPORT_MODEL || "gpt-4o",
  rag_answer: process.env.OPENAI_REPORT_MODEL || "gpt-4o",
  labs_analysis: process.env.OPENAI_REPORT_MODEL || "gpt-4o",
};

const ANTHROPIC_MODELS: Record<LlmTask, string> = {
  classify: process.env.ANTHROPIC_CLASSIFY_MODEL || "claude-3-5-haiku-latest",
  daily_report: process.env.ANTHROPIC_REPORT_MODEL || "claude-3-5-sonnet-latest",
  area_scoring: process.env.ANTHROPIC_REPORT_MODEL || "claude-3-5-sonnet-latest",
  rag_answer: process.env.ANTHROPIC_REPORT_MODEL || "claude-3-5-sonnet-latest",
  labs_analysis: process.env.ANTHROPIC_REPORT_MODEL || "claude-3-5-sonnet-latest",
};

export function resolveModel(task: LlmTask, provider: ProviderName): string {
  return provider === "anthropic" ? ANTHROPIC_MODELS[task] : OPENAI_MODELS[task];
}
