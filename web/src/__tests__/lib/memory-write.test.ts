import { describe, it, expect } from "vitest";
import { draftsToInsertRows, MEMORY_SOURCE_TYPES } from "@/lib/memory/memoryItemContract";

describe("draftsToInsertRows", () => {
  it("shapes a draft into the memory_items row contract, defaulting stability", () => {
    const rows = draftsToInsertRows([
      {
        userId: "user-1",
        sourceType: "intervention",
        sourceId: "int-1",
        title: "Low-energy pattern",
        content: "Prefers tiny first moves.",
        memoryType: "behavioral",
        importance: 3,
        tags: ["intervention", "pattern"],
      },
    ]);
    expect(rows).toEqual([
      {
        user_id: "user-1",
        source_type: "intervention",
        source_id: "int-1",
        title: "Low-energy pattern",
        content: "Prefers tiny first moves.",
        memory_type: "behavioral",
        importance: 3,
        stability: "stable",
        tags: ["intervention", "pattern"],
      },
    ]);
  });

  it("defaults source_id to null when omitted", () => {
    const [row] = draftsToInsertRows([
      {
        userId: "u", sourceType: "labs", title: "t", content: "c",
        memoryType: "insight", importance: 1, tags: [],
      },
    ]);
    expect(row.source_id).toBeNull();
  });

  it("preserves an explicit stability override", () => {
    const [row] = draftsToInsertRows([
      {
        userId: "u", sourceType: "labs", title: "t", content: "c",
        memoryType: "insight", importance: 1, tags: [], stability: "volatile",
      },
    ]);
    expect(row.stability).toBe("volatile");
  });

  it("requires an explicit memory_type — no silent DB-default fallback (issue #22)", () => {
    const [row] = draftsToInsertRows([
      {
        userId: "u", sourceType: "labs", title: "t", content: "c",
        memoryType: "insight", importance: 1, tags: [],
      },
    ]);
    expect(row.memory_type).toBe("insight");
  });

  it("omits confidence entirely when not provided (nullable/optional DB column)", () => {
    const [row] = draftsToInsertRows([
      {
        userId: "u", sourceType: "labs", title: "t", content: "c",
        memoryType: "insight", importance: 1, tags: [],
      },
    ]);
    expect("confidence" in row).toBe(false);
  });

  it("passes through confidence when the synthesizer provides one", () => {
    const [row] = draftsToInsertRows([
      {
        userId: "u", sourceType: "brain_synthesis", title: "t", content: "c",
        memoryType: "insight", importance: 1, tags: [], confidence: 0.82,
      },
    ]);
    expect(row.confidence).toBe(0.82);
  });

  it("only recognizes the real source types observed in application code", () => {
    // intervention     -> app/api/interventions/[id]/save-memory/route.ts
    // labs             -> app/api/labs/sessions/[id]/complete/route.ts
    // inbox            -> app/api/memory/items/route.ts (public API — was
    //                     unrestricted free-text; review issue #23)
    // brain_synthesis  -> lib/ai-brain/synthesizer.ts
    // A new source must be added here deliberately, not passed through as
    // whatever string a caller happens to send.
    expect(MEMORY_SOURCE_TYPES).toEqual(["intervention", "labs", "inbox", "brain_synthesis"]);
  });
});
