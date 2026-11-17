import { NextResponse } from "next/server";
import { consumePasteView } from "@/lib/paste-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const result = await consumePasteView(id);

    switch (result.status) {
      case "INVALID_ID":
        return NextResponse.json(
          { error: "Invalid paste ID format." },
          { status: 400, headers: NO_STORE_HEADERS }
        );

      case "NOT_FOUND":
        return NextResponse.json(
          { error: "Paste not found." },
          { status: 404, headers: NO_STORE_HEADERS }
        );

      case "EXPIRED":
        return NextResponse.json(
          { error: "This paste has expired and is no longer available." },
          { status: 410, headers: NO_STORE_HEADERS }
        );

      case "VIEW_LIMIT_EXHAUSTED":
        return NextResponse.json(
          {
            error:
              "This paste has reached its maximum view limit and is no longer available.",
          },
          { status: 410, headers: NO_STORE_HEADERS }
        );

      case "OK":
        return NextResponse.json(
          {
            id: result.paste.id,
            content: result.paste.content,
            createdAt: result.paste.createdAt.toISOString(),
            expiresAt: result.paste.expiresAt
              ? result.paste.expiresAt.toISOString()
              : null,
            maxViews: result.paste.maxViews,
            viewCount: result.paste.viewCount,
            remainingViews: result.paste.remainingViews,
          },
          { status: 200, headers: NO_STORE_HEADERS }
        );
    }
  } catch (error) {
    console.error("Failed to retrieve paste:", error);
    return NextResponse.json(
      { error: "An unexpected server error occurred while retrieving the paste." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
