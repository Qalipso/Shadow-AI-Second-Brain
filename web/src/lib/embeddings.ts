import "server-only";
import { getLlm, hasLlm, estimateCostUsd } from "./llm";

// text-embedding-3-small: 1536 dims, $0.02/1M tokens. Matches entries.embedding vector(1536).
const EMBED_MODEL = "text-embedding-3-small";
const EMBED_DIMS = 1536;

// Pricing: $0.02 per 1M tokens (input only, no output tokens).
const EMBED_PRICE_PER_M = 0.02;

export type EmbedResult = {
  embedding: number[];
  model: string;
  tokensUsed: number;
  costUsd: number;
};

export async function generateEmbedding(text: string): Promise<EmbedResult> {
  if (!hasLlm()) {
    throw new Error("OPENAI_API_KEY missing.");
  }

  const openai = getLlm();
  const resp = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: text,
    dimensions: EMBED_DIMS,
  });

  const embedding = resp.data[0]?.embedding ?? [];
  const tokensUsed = resp.usage?.total_tokens ?? 0;
  const costUsd = (tokensUsed / 1_000_000) * EMBED_PRICE_PER_M;

  return { embedding, model: EMBED_MODEL, tokensUsed, costUsd };
}

export function embedModel(): string {
  return EMBED_MODEL;
}
