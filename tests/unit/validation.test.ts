import { describe, expect, it } from "vitest";
import { generatePasteId, isValidPasteId } from "@/lib/id";
import {
  createPasteSchema,
  MAX_CONTENT_LENGTH,
  MAX_EXPIRY_SECONDS,
  MAX_VIEWS_LIMIT,
} from "@/lib/validation";

describe("ID utilities", () => {
  it("generates unique URL-safe IDs that pass validation", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const id = generatePasteId();
      expect(isValidPasteId(id)).toBe(true);
      expect(id.length).toBe(12);
      ids.add(id);
    }
    expect(ids.size).toBe(200);
  });

  it("rejects malformed, too-short, or unsafe IDs", () => {
    expect(isValidPasteId("")).toBe(false);
    expect(isValidPasteId("short")).toBe(false);
    expect(isValidPasteId("a".repeat(33))).toBe(false);
    expect(isValidPasteId("invalid/id+12")).toBe(false);
    expect(isValidPasteId("has spaces 12")).toBe(false);
    expect(isValidPasteId("valid_ID-123")).toBe(true);
  });
});

describe("createPasteSchema", () => {
  it("accepts valid content with optional expiry and maxViews", () => {
    const result = createPasteSchema.safeParse({
      content: "console.log('hello');",
      expiresInSeconds: 3600,
      maxViews: 5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty or whitespace-only content", () => {
    expect(createPasteSchema.safeParse({ content: "" }).success).toBe(false);
    expect(createPasteSchema.safeParse({ content: "   \n\t  " }).success).toBe(
      false
    );
  });

  it("rejects content exceeding MAX_CONTENT_LENGTH", () => {
    const oversized = "x".repeat(MAX_CONTENT_LENGTH + 1);
    expect(createPasteSchema.safeParse({ content: oversized }).success).toBe(
      false
    );
  });

  it("rejects invalid expiresInSeconds and maxViews values", () => {
    expect(
      createPasteSchema.safeParse({ content: "ok", expiresInSeconds: 0 })
        .success
    ).toBe(false);
    expect(
      createPasteSchema.safeParse({
        content: "ok",
        expiresInSeconds: MAX_EXPIRY_SECONDS + 1,
      }).success
    ).toBe(false);
    expect(
      createPasteSchema.safeParse({ content: "ok", expiresInSeconds: 12.5 })
        .success
    ).toBe(false);
    expect(
      createPasteSchema.safeParse({ content: "ok", maxViews: 0 }).success
    ).toBe(false);
    expect(
      createPasteSchema.safeParse({
        content: "ok",
        maxViews: MAX_VIEWS_LIMIT + 1,
      }).success
    ).toBe(false);
  });
});
