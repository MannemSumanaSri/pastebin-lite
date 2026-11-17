import { NextResponse } from "next/server";
import { createPasteSchema } from "@/lib/validation";
import { createPaste } from "@/lib/paste-service";
import { buildPasteUrl } from "@/lib/url";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const parsed = createPasteSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        error: firstIssue?.message ?? "Validation failed.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const paste = await createPaste(parsed.data);
    const url = buildPasteUrl(paste.id, request);

    return NextResponse.json(
      {
        id: paste.id,
        url,
        createdAt: paste.createdAt.toISOString(),
        expiresAt: paste.expiresAt ? paste.expiresAt.toISOString() : null,
        maxViews: paste.maxViews,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create paste:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred while creating the paste." },
      { status: 500 }
    );
  }
}
