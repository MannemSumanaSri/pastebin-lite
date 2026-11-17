import { beforeEach, describe, expect, it } from "vitest";
import { consumePasteView, createPaste } from "@/lib/paste-service";
import { InMemoryPasteDb } from "../mocks/prisma";

describe("paste-service", () => {
  const db = new InMemoryPasteDb();

  beforeEach(() => {
    db.clear();
  });

  it("starts viewCount at 0 on creation and sets server-side expiresAt", async () => {
    const now = new Date("2026-11-17T10:00:00.000Z");
    const created = await createPaste(
      { content: "hello", expiresInSeconds: 60, maxViews: 3 },
      { db, now }
    );

    expect(created.expiresAt?.toISOString()).toBe("2026-11-17T10:01:00.000Z");
    expect(created.maxViews).toBe(3);

    const raw = db.getRaw(created.id);
    expect(raw?.viewCount).toBe(0);
  });

  it("rejects access when current time is equal to or greater than expiresAt", async () => {
    const createdAt = new Date("2026-11-17T10:00:00.000Z");
    const created = await createPaste(
      { content: "timed paste", expiresInSeconds: 60 },
      { db, now: createdAt }
    );

    // 1 ms before expiry -> OK
    const beforeExpiry = new Date("2026-11-17T10:00:59.999Z");
    const okResult = await consumePasteView(created.id, {
      db,
      now: beforeExpiry,
    });
    expect(okResult.status).toBe("OK");

    // Exactly at expiresAt -> EXPIRED (current time >= expiry time)
    const atExpiry = new Date("2026-11-17T10:01:00.000Z");
    const exactResult = await consumePasteView(created.id, {
      db,
      now: atExpiry,
    });
    expect(exactResult.status).toBe("EXPIRED");

    // After expiresAt -> EXPIRED
    const afterExpiry = new Date("2026-11-17T10:05:00.000Z");
    const lateResult = await consumePasteView(created.id, {
      db,
      now: afterExpiry,
    });
    expect(lateResult.status).toBe("EXPIRED");
  });

  it("enforces maxViews strictly under concurrent requests", async () => {
    const now = new Date("2026-11-17T10:00:00.000Z");
    const created = await createPaste(
      { content: "concurrent secret", maxViews: 3 },
      { db, now }
    );

    const results = await Promise.all(
      Array.from({ length: 10 }, () => consumePasteView(created.id, { db, now }))
    );

    const okCount = results.filter((r) => r.status === "OK").length;
    const exhaustedCount = results.filter(
      (r) => r.status === "VIEW_LIMIT_EXHAUSTED"
    ).length;

    expect(okCount).toBe(3);
    expect(exhaustedCount).toBe(7);
    expect(db.getRaw(created.id)?.viewCount).toBe(3);
  });
});
