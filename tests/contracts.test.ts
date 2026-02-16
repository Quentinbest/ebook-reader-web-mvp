import { describe, expect, it } from "vitest";
import { DEFAULT_READER_PREFERENCES } from "../src/types/contracts";

describe("default reader preferences", () => {
  it("stays inside expected ranges", () => {
    expect(DEFAULT_READER_PREFERENCES.fontSize).toBeGreaterThanOrEqual(14);
    expect(DEFAULT_READER_PREFERENCES.fontSize).toBeLessThanOrEqual(30);
    expect(DEFAULT_READER_PREFERENCES.lineHeight).toBeGreaterThanOrEqual(1.3);
    expect(DEFAULT_READER_PREFERENCES.lineHeight).toBeLessThanOrEqual(2.1);
  });
});
