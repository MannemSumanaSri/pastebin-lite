"use client";

import Link from "next/link";
import { Clock, Eye, FileText, Plus } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

type PasteViewerProps = {
  id: string;
  content: string;
  createdAt: string;
  expiresAt: string | null;
  maxViews: number | null;
  viewCount: number;
  remainingViews: number | null;
};

export function PasteViewer({
  id,
  content,
  createdAt,
  expiresAt,
  maxViews,
  viewCount,
  remainingViews,
}: PasteViewerProps) {
  const lineCount = content.split("\n").length;

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
          <span className="font-mono text-zinc-200 font-medium">#{id}</span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-zinc-500" />
            {lineCount} {lineCount === 1 ? "line" : "lines"} ·{" "}
            {content.length.toLocaleString("en-US")} chars
          </span>
          <span
            className="inline-flex items-center gap-1.5"
            suppressHydrationWarning
          >
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            Created {new Date(createdAt).toLocaleString()}
          </span>
          {expiresAt && (
            <span
              className="inline-flex items-center gap-1.5 text-amber-300/90"
              suppressHydrationWarning
            >
              <Clock className="w-3.5 h-3.5" />
              Expires {new Date(expiresAt).toLocaleString()}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            {maxViews !== null
              ? `View ${viewCount} of ${maxViews} (${remainingViews} left)`
              : `${viewCount} ${viewCount === 1 ? "view" : "views"}`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <CopyButton
            text={content}
            label="Copy Content"
            copiedLabel="Copied!"
          />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
        <pre className="p-4 sm:p-5 overflow-x-auto text-sm font-mono text-zinc-100 leading-relaxed whitespace-pre">
          <code>{content}</code>
        </pre>
      </div>
    </section>
  );
}