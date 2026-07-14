import "server-only";

// Provider-agnostic LLM surface (DECISIONS/011). This module defines OUR shapes,
// not any vendor's — adapters in providers/ normalize vendor request/response
// formats to this line. Nothing vendor-shaped should escape a provider file.
//
// Scope is deliberately narrow: only what Shadow's real call sites use today
// (plain completion + JSON-mode completion). No stream()/tool-calling here —
// Shadow doesn't implement either anywhere yet (see ARCHITECTURE.md review
// findings); adding unused interface surface repeats a pattern already flagged
// elsewhere in this codebase (the memory graph nobody reads). Extend when a
// real call site needs it, not before.

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface CompleteOptions {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  /** Ask for strict JSON output. OpenAI: response_format=json_object (API-enforced).
   *  Anthropic has no equivalent — enforcement is prompt-only there; callers should
   *  still validate the response (Shadow already does, via zod parseClassificationResponse). */
  jsonMode?: boolean;
}

export interface LLMUsage {
  tokensIn: number;
  tokensOut: number;
}

export interface LLMResponse {
  text: string;
  usage: LLMUsage;
  provider: string;
}

/** Normalized 5xx / connectivity failure, regardless of vendor. */
export class LLMUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMUnavailable";
  }
}

/** Normalized 429 / rate-limit / overload, regardless of vendor. */
export class LLMRateLimited extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMRateLimited";
  }
}

export interface LLMProvider {
  readonly name: string;
  complete(opts: CompleteOptions): Promise<LLMResponse>;
}
