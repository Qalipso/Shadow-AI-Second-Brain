import { describe, it, expect } from "vitest";
import { parseClassificationResponse } from "@/lib/entries/classification";

const VALID_JSON = JSON.stringify({
  summary: "User wants to call mom tomorrow.",
  entry_type: "task",
  life_area_slug: "social",
  emotion: { primary: "care", intensity: 6 },
  suggested_followup: null,
  extracted_task: { title: "Call mom", due: "2026-05-21" },
});

describe("parseClassificationResponse", () => {
  it("parses a clean JSON string", () => {
    const result = parseClassificationResponse(VALID_JSON);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entry_type).toBe("task");
      expect(result.data.life_area_slug).toBe("social");
      expect(result.data.extracted_task?.title).toBe("Call mom");
    }
  });

  it("strips markdown code fences", () => {
    const fenced = `\`\`\`json\n${VALID_JSON}\n\`\`\``;
    const result = parseClassificationResponse(fenced);
    expect(result.success).toBe(true);
  });

  it("extracts JSON from prose prefix", () => {
    const withProse = `Here is my analysis:\n${VALID_JSON}\nHope that helps!`;
    const result = parseClassificationResponse(withProse);
    expect(result.success).toBe(true);
  });

  it("returns error on invalid JSON", () => {
    const result = parseClassificationResponse("not json at all");
    expect(result.success).toBe(false);
  });

  it("returns error when entry_type is invalid", () => {
    const bad = JSON.stringify({ ...JSON.parse(VALID_JSON), entry_type: "invalid_type" });
    const result = parseClassificationResponse(bad);
    expect(result.success).toBe(false);
  });

  it("returns error when life_area_slug is invalid", () => {
    const bad = JSON.stringify({ ...JSON.parse(VALID_JSON), life_area_slug: "badarea" });
    const result = parseClassificationResponse(bad);
    expect(result.success).toBe(false);
  });

  it("accepts null emotion", () => {
    const noEmotion = JSON.stringify({ ...JSON.parse(VALID_JSON), emotion: null });
    const result = parseClassificationResponse(noEmotion);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.emotion).toBeNull();
  });

  it("accepts null extracted_task", () => {
    const noTask = JSON.stringify({ ...JSON.parse(VALID_JSON), extracted_task: null });
    const result = parseClassificationResponse(noTask);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.extracted_task).toBeNull();
  });

  it("enforces emotion intensity 1..10", () => {
    const bad = JSON.stringify({
      ...JSON.parse(VALID_JSON),
      emotion: { primary: "joy", intensity: 11 },
    });
    const result = parseClassificationResponse(bad);
    expect(result.success).toBe(false);
  });
});
