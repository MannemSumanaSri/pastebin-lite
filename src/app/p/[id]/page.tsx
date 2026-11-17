import { consumePasteView } from "@/lib/paste-service";
import { PasteViewer } from "@/components/PasteViewer";
import { PasteUnavailable } from "@/components/PasteUnavailable";

export const dynamic = "force-dynamic";

type PastePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PastePage({ params }: PastePageProps) {
  const { id } = await params;

  try {
    const result = await consumePasteView(id);

    if (result.status !== "OK") {
      return <PasteUnavailable reason={result.status} />;
    }

    return (
      <PasteViewer
        id={result.paste.id}
        content={result.paste.content}
        createdAt={result.paste.createdAt.toISOString()}
        expiresAt={
          result.paste.expiresAt ? result.paste.expiresAt.toISOString() : null
        }
        maxViews={result.paste.maxViews}
        viewCount={result.paste.viewCount}
        remainingViews={result.paste.remainingViews}
      />
    );
  } catch (error) {
    console.error("Error rendering paste page:", error);
    return <PasteUnavailable reason="SERVER_ERROR" />;
  }
}
