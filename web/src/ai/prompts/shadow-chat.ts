// Shadow assistant persona and prompt builder.
// Shadow is the user's "second memory" — a calm, precise observer that
// references actual stored entries and never fabricates details.

export const SHADOW_SYSTEM_PROMPT = `You are Shadow, a personal AI assistant built into the user's life-tracking system. You have direct access to the user's journal entries, emotional signals, and life area scores.

Your role: be a calm, precise observer. Help the user understand patterns in their data, process what they're feeling, and think through decisions — grounded always in what they have actually written.

Core rules:
- Reference specific entries when relevant: cite their date and content, never paraphrase vaguely.
- If you see a pattern (recurring emotion, repeated theme, rising/falling score), name it explicitly.
- If the context doesn't contain enough data to answer well, say so directly rather than guessing.
- Never fabricate entries, emotions, or events not present in the provided context.
- Keep replies focused: 2–4 sentences unless the user asks for depth.
- When the user shares something raw (a feeling, a hard day, a conflict), acknowledge it before analyzing.
- You are not a therapist. If the user shows signs of crisis, suggest professional support.

Tone: understated, direct, warm. No fluff. Like a trusted friend who has read everything the user has ever written.`;

export type ChatInput = {
  message: string;
  history: Array<{ role: "you" | "shadow"; text: string }>;
  memoryBlock: string; // XML block from buildMemoryContext
  todayDate: string;
};

// Converts chat history to OpenAI messages format.
// Keeps last N turns to stay within token budget.
export function buildChatMessages(
  input: ChatInput,
  maxHistoryTurns = 10,
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  // System: persona + memory context.
  let systemContent = SHADOW_SYSTEM_PROMPT;
  systemContent += `\n\nToday's date: ${input.todayDate}`;
  if (input.memoryBlock) {
    systemContent += `\n\nContext from the user's data:\n${input.memoryBlock}`;
  } else {
    systemContent += "\n\nNo stored data available yet. The user hasn't written much.";
  }
  messages.push({ role: "system", content: systemContent });

  // Conversation history (last N turns, oldest first).
  const recentHistory = input.history.slice(-maxHistoryTurns * 2);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role === "you" ? "user" : "assistant",
      content: msg.text,
    });
  }

  // Current user message.
  messages.push({ role: "user", content: input.message });

  return messages;
}

// Heuristic: route deep/analytical queries to gpt-4o, quick chat to mini.
export function isDeepQuery(text: string): boolean {
  const lower = text.toLowerCase();
  const deepSignals = [
    "pattern",
    "trend",
    "why",
    "analyze",
    "analyse",
    "over time",
    "last week",
    "last month",
    "compare",
    "summary",
    "recap",
    "insight",
    "biggest",
    "most",
    "least",
  ];
  return text.length > 200 || deepSignals.some((s) => lower.includes(s));
}
