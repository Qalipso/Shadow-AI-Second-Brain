import "server-only";

// Heuristic filter to keep test/QA artifacts and prompt-injection strings out of
// the Memory Synthesizer. These rows pollute the graph and must never be fed to
// the LLM as if they were real captures.

const JUNK_PATTERNS: RegExp[] = [
  /drop\s+table/i,
  /onerror\s*=/i,
  /<\s*script/i,
  /<\s*img\b/i,
  /\bunion\s+select\b/i,
  /double-submit/i,
  /multitab/i,
  /latency-/i,
  /\bqa\b.*\b(regression|note|test)\b/i,
  /\btest\s+(message|entry|capture)\b/i,
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /system\s+prompt/i,
  /\bPWNED\b/,
];

/**
 * Returns true when an entry looks like test/QA/injection noise rather than a
 * genuine capture. Conservative: only filters clear artifacts.
 */
export function isJunkEntry(rawText: string | null | undefined): boolean {
  const text = (rawText ?? "").trim();
  if (text.length < 8) return true; // too short to carry meaning
  if (/^[\d\s.,;:_\-]+$/.test(text)) return true; // pure numbers/punctuation
  if (/(.)\1{6,}/.test(text)) return true; // long repeated-char runs (xxxxxxx)
  if (JUNK_PATTERNS.some((re) => re.test(text))) return true;
  // Mostly non-alphanumeric (emoji/symbol spam)
  const alnum = text.replace(/[^a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF]/g, "").length;
  if (alnum < Math.max(4, text.length * 0.3)) return true;
  return false;
}
