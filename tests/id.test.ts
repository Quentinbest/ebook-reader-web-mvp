import { describe, expect, it } from "vitest";
import { createId, stableHash } from "../src/lib/id";

describe("id helpers", () => {
  it("creates prefixed ids", () => {
    const id = createId("ann");
    expect(id.startsWith("ann_")).toBe(true);
  });

  it("creates stable hash for same input", async () => {
    const a = await stableHash("book:1");
    const b = await stableHash("book:1");
    const c = await stableHash("book:2");

    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
