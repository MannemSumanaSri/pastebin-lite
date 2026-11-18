import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InMemoryPasteDb } from "../mocks/prisma";

vi.mock("@/lib/prisma", async () => {
  const { InMemoryPasteDb: MockDb } = await import("../mocks/prisma");
  return {
    prisma: new MockDb(),
  };
});

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/pastes/route";
import { GET } from "@/app/api/pastes/[id]/route";

const mockDb = prisma as unknown as InMemoryPasteDb;

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/pastes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function createGetRequest(id: string): [Request, { params: Promise<{ id: string }> }] {
  return [
    new Request(`http://localhost:3000/api/pastes/${id}`, { method: "GET" }),
    { params: Promise.resolve({ id }) },
  ];
}

describe("Pastes REST API", () => {
  beforeEach(() => {
    mockDb.clear();
  });

  it("1. creates a paste successfully and returns 201 with shareable URL", async () => {
    const res = await POST(
      createPostRequest({
        content: "const greeting = 'hello world';",
      })
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.id).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(json.url).toBe(`http://localhost:3000/p/${json.id}`);
    expect(json.expiresAt).toBeNull();
    expect(json.maxViews).toBeNull();
    expect(typeof json.createdAt).toBe("string");
    expect(mockDb.getRaw(json.id)?.viewCount).toBe(0);
  });

  it("2. rejects creating a paste with empty or whitespace-only content (400)", async () => {
    const emptyRes = await POST(createPostRequest({ content: "" }));
    expect(emptyRes.status).toBe(400);
    const emptyJson = await emptyRes.json();
    expect(emptyJson.error).toBeTruthy();

    const wsRes = await POST(createPostRequest({ content: "   \n  " }));
    expect(wsRes.status).toBe(400);
  });

  it("3. rejects invalid input and malformed JSON (400)", async () => {
    const malformedRes = await POST(createPostRequest("{not-valid-json"));
    expect(malformedRes.status).toBe(400);

    const negativeViewsRes = await POST(
      createPostRequest({ content: "valid", maxViews: -2 })
    );
    expect(negativeViewsRes.status).toBe(400);

    const badExpiryRes = await POST(
      createPostRequest({ content: "valid", expiresInSeconds: "100" })
    );
    expect(badExpiryRes.status).toBe(400);
  });

  it("4. retrieves an existing paste and increments viewCount (200)", async () => {
    const createRes = await POST(
      createPostRequest({ content: "SELECT * FROM users;" })
    );
    const { id } = await createRes.json();

    const [req, ctx] = createGetRequest(id);
    const getRes = await GET(req, ctx);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Cache-Control")).toContain("no-store");

    const data = await getRes.json();
    expect(data.id).toBe(id);
    expect(data.content).toBe("SELECT * FROM users;");
    expect(data.viewCount).toBe(1);
    expect(data.remainingViews).toBeNull();
  });

it("5. returns 404 when retrieving a nonexistent paste", async () => {
    const [req, ctx] = createGetRequest("NonExistent1");
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/not found/i);
  });

  it("6. keeps a paste without expiry accessible across multiple views", async () => {
    const createRes = await POST(
      createPostRequest({ content: "persistent note" })
    );
    const { id } = await createRes.json();

    for (let i = 1; i <= 3; i++) {
      const [req, ctx] = createGetRequest(id);
      const res = await GET(req, ctx);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.viewCount).toBe(i);
    }
  });

  it("7. allows retrieving a paste with a future expiry", async () => {
    const createRes = await POST(
      createPostRequest({ content: "future paste", expiresInSeconds: 3600 })
    );
    const { id, expiresAt } = await createRes.json();
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

    const [req, ctx] = createGetRequest(id);
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.content).toBe("future paste");
  });

it("8. returns 410 for an already-expired paste and does not increment viewCount", async () => {
    mockDb.seed({
      id: "ExpiredPaste",
      content: "too late",
      createdAt: new Date(Date.now() - 120_000),
      expiresAt: new Date(Date.now() - 1_000),
      maxViews: 5,
      viewCount: 0,
    });

    const [req, ctx] = createGetRequest("ExpiredPaste");
    const res = await GET(req, ctx);
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toMatch(/expired/i);
    expect(mockDb.getRaw("ExpiredPaste")?.viewCount).toBe(0);
  });

  it("9 & 10. enforces maximum view count and returns 410 once exhausted", async () => {
    const createRes = await POST(
      createPostRequest({ content: "burn after reading", maxViews: 2 })
    );
    const { id } = await createRes.json();

    // View 1
    const res1 = await GET(...createGetRequest(id));
    expect(res1.status).toBe(200);
    expect((await res1.json()).remainingViews).toBe(1);

    // View 2
    const res2 = await GET(...createGetRequest(id));
    expect(res2.status).toBe(200);
    expect((await res2.json()).remainingViews).toBe(0);

    // View 3 -> 410 Gone
    const res3 = await GET(...createGetRequest(id));
    expect(res3.status).toBe(410);
    expect((await res3.json()).error).toMatch(/view limit/i);
    expect(mockDb.getRaw(id)?.viewCount).toBe(2);
  });

  it("11. handles concurrent requests near the view limit without exceeding maxViews", async () => {
    const createRes = await POST(
      createPostRequest({ content: "race test", maxViews: 3 })
    );
    const { id } = await createRes.json();

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => GET(...createGetRequest(id)))
    );

    const statuses = responses.map((r) => r.status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(3);
    expect(statuses.filter((s) => s === 410)).toHaveLength(7);
    expect(mockDb.getRaw(id)?.viewCount).toBe(3);
  });

  it("12. returns 400 for malformed paste IDs", async () => {
    const [req, ctx] = createGetRequest("bad");
    const res = await GET(req, ctx);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid/i);
  });

  it("13. returns 500 gracefully on database errors without leaking credentials", async () => {
    mockDb.forceError = new Error("Connection to postgres://user:secret@db failed");

    const postRes = await POST(createPostRequest({ content: "test" }));
    expect(postRes.status).toBe(500);
    const postJson = await postRes.json();
    expect(postJson.error).not.toContain("secret");

    const getRes = await GET(...createGetRequest("ValidPaste12"));
    expect(getRes.status).toBe(500);
    const getJson = await getRes.json();
    expect(getJson.error).not.toContain("secret");
  });
});
