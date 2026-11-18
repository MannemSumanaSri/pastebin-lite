import { Prisma } from "@prisma/client";
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
  paste: Pick<
    PrismaClient["paste"],
    "create" | "findUnique" | "updateManyAndReturn"
  >;
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
 * P2002 ID collisions are retried up to three times.
 * The creator's initial response does NOT count as a view.
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

  const maxViews =
    typeof input.maxViews === "number" ? input.maxViews : null;

  const MAX_ATTEMPTS = 3;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const id = generatePasteId();

    try {
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
    } catch (error) {
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002";

      if (!isUniqueViolation || attempt === MAX_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique paste ID");
}

/**
 * Retrieves a paste and atomically increments its viewCount if valid.
 * Uses updateManyAndReturn so concurrent responses receive the exact updated count.
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

  if (
    existing.expiresAt !== null &&
    now.getTime() >= existing.expiresAt.getTime()
  ) {
    return { status: "EXPIRED" };
  }

  if (
    existing.maxViews !== null &&
    existing.viewCount >= existing.maxViews
  ) {
    return { status: "VIEW_LIMIT_EXHAUSTED" };
  }

  const updatedRows = await db.paste.updateManyAndReturn({
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

  if (updatedRows.length === 0) {
    const latest = await db.paste.findUnique({
      where: { id },
    });

    if (!latest) {
      return { status: "NOT_FOUND" };
    }

    if (
      latest.expiresAt !== null &&
      now.getTime() >= latest.expiresAt.getTime()
    ) {
      return { status: "EXPIRED" };
    }

    return { status: "VIEW_LIMIT_EXHAUSTED" };
  }

  const updated = updatedRows[0];

  const remainingViews =
    updated.maxViews !== null
      ? Math.max(0, updated.maxViews - updated.viewCount)
      : null;

  return {
    status: "OK",
    paste: {
      id: updated.id,
      content: updated.content,
      createdAt: updated.createdAt,
      expiresAt: updated.expiresAt,
      maxViews: updated.maxViews,
      viewCount: updated.viewCount,
      remainingViews,
    },
  };
}