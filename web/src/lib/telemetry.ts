// Telemetry — lightweight client-side event tracker.
// Dev: console.log only.
// Prod: extend with Supabase insert or analytics provider.

export const EVENTS = {
  CAPTURE_SUBMITTED: "capture_submitted",
  PARSE_COMPLETED: "parse_completed",
  PARSE_FAILED: "parse_failed",
  MEMORY_SAVED: "memory_saved",
  MEMORY_DISCARDED: "memory_discarded",
  INSIGHT_GENERATED: "insight_generated",
  LIFE_CIRCLE_UPDATED: "life_circle_updated",
  ONBOARDING_STEP: "onboarding_step",
  ONBOARDING_COMPLETED: "onboarding_completed",
  MEMORY_SEARCH: "memory_search",
} as const;

export type TelemetryEvent = (typeof EVENTS)[keyof typeof EVENTS];

export function track(
  event: TelemetryEvent,
  props?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === "development") {
    console.log("[shadow:telemetry]", event, props ?? "");
  }
  // TODO: insert to Supabase telemetry_events table in production
  // void fetch("/api/telemetry", { method: "POST", body: JSON.stringify({ event, props }) })
}
