import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePasteId, isValidPasteId } from "@/lib/id";
import type { CreatePasteInput } from "@/lib/validation";

export type PasteRecord = {
  id: string;
  content: string;
  createdAt: Date;
  expiresAt: Date | null;
  maxViews: number | null;
  viewCount: number;
};

export type PasteDbClient = {
  paste: Pick<PrismaClient["paste"], "create" | "findUnique" | "updateMany">;
};

export type CreatePasteResult = {
  id: string;
  createdAt: Date;
  expiresAt: Date | null;
  maxViews: number | null;
};

export type ConsumePasteResult =
  | {
      status: "OK";
      paste: {
        id: string;
        content: string;
        createdAt: Date;
        expiresAt: Date | null;
        maxViews: number | null;
        viewCount: number;
        remainingViews: number | null;
      };
    }
  | { status: "INVALID_ID" }
  | { status: "NOT_FOUND" }
  | { status: "EXPIRED" }
  | { status: "VIEW_LIMIT_EXHAUSTED" };

/**
 * Creates a new paste with a cryptographically random ID.
 * Note: The creator's initial response does NOT count as a view (viewCount starts at 0).
 */
export async function createPaste(
  input: CreatePasteInput,
  options?: { db?: PasteDbClient; now?: Date }
): Promise<CreatePasteResult> {
  const db = options?.db ?? prisma;
  const now = options?.now ?? new Date();

  const expiresAt =
    typeof input.expiresInSeconds === "number"
      ? new Date(now.getTime() + input.expiresInSeconds * 1000)
      : null;

  const maxViews = typeof input.maxViews === "number" ? input.maxViews : null;
  const id = generatePasteId();

  const created = await db.paste.create({
    data: {
      id,
      content: input.content,
      createdAt: now,
      expiresAt,
      maxViews,
      viewCount: 0,
    },
  });

  return {
    id: created.id,
    createdAt: created.createdAt,
    expiresAt: created.expiresAt,
    maxViews: created.maxViews,
  };
}

/**
 * Retrieves a paste and atomically increments its viewCount if valid.
 *
 * Concurrency & Expiry Rules:
 * - Rejects access when `now >= expiresAt` (HTTP 410).
 * - Uses an atomic conditional `updateMany` with `viewCount < maxViews` and
 *   `(expiresAt IS NULL OR expiresAt > now)` so simultaneous requests near the
 *   view limit can never exceed `maxViews`.
 * - Only successful views increment `viewCount`.
 */
export async function consumePasteView(
  id: string,
  options?: { db?: PasteDbClient; now?: Date }
): Promise<ConsumePasteResult> {
  if (!isValidPasteId(id)) {
    return { status: "INVALID_ID" };
  }

  const db = options?.db ?? prisma;
  const now = options?.now ?? new Date();

  const existing = await db.paste.findUnique({
    where: { id },
  });

  if (!existing) {
    return { status: "NOT_FOUND" };
  }

  if (existing.expiresAt !== null && now.getTime() >= existing.expiresAt.getTime()) {
    return { status: "EXPIRED" };
  }

  if (existing.maxViews !== null && existing.viewCount >= existing.maxViews) {
    return { status: "VIEW_LIMIT_EXHAUSTED" };
  }

  // Atomic conditional increment: prevents race conditions under concurrent reads
  const updateResult = await db.paste.updateMany({
    where: {
      id,
      AND: [
        {
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        ...(existing.maxViews !== null
          ? [{ viewCount: { lt: existing.maxViews } }]
          : []),
      ],
    },
    data: {
      viewCount: {
        increment: 1,
      },
    },
  });

  if (updateResult.count === 0) {
    // Another concurrent request either exhausted the view limit or the paste just expired
    const latest = await db.paste.findUnique({ where: { id } });
    if (!latest) {
      return { status: "NOT_FOUND" };
    }
    if (latest.expiresAt !== null && now.getTime() >= latest.expiresAt.getTime()) {
      return { status: "EXPIRED" };
    }
    return { status: "VIEW_LIMIT_EXHAUSTED" };
  }

  const updatedViewCount = existing.viewCount + 1;
  const remainingViews =
    existing.maxViews !== null ? Math.max(0, existing.maxViews - updatedViewCount) : null;

  return {
    status: "OK",
    paste: {
      id: existing.id,
      content: existing.content,
      createdAt: existing.createdAt,
      expiresAt: existing.expiresAt,
      maxViews: existing.maxViews,
      viewCount: updatedViewCount,
      remainingViews,
    },
  };
}
