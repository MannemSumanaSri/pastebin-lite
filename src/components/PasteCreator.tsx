"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Loader2,
  Plus,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { MAX_CONTENT_LENGTH, MAX_EXPIRY_SECONDS, MAX_VIEWS_LIMIT } from "@/lib/validation";

type CreatedPaste = {
  id: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  maxViews: number | null;
};

const EXPIRY_PRESETS = [
  { label: "Never", value: "" },
  { label: "5 minutes", value: "300" },
  { label: "1 hour", value: "3600" },
  { label: "24 hours", value: "86400" },
  { label: "7 days", value: "604800" },
  { label: "30 days", value: "2592000" },
  { label: "Custom (seconds)", value: "custom" },
] as const;

export function PasteCreator() {
  const [content, setContent] = useState("");
  const [expiryPreset, setExpiryPreset] = useState<string>("");
  const [customExpirySeconds, setCustomExpirySeconds] = useState<string>("");
  const [maxViewsInput, setMaxViewsInput] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPaste, setCreatedPaste] = useState<CreatedPaste | null>(null);

  function resolveExpirySeconds(): number | null {
    if (!expiryPreset) return null;
    if (expiryPreset === "custom") {
      const parsed = Number(customExpirySeconds);
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    return Number(expiryPreset);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (content.trim().length === 0) {
      setError("Paste content cannot be empty.");
      return;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      setError(
        `Paste content cannot exceed ${MAX_CONTENT_LENGTH.toLocaleString()} characters.`
      );
      return;
    }

    const expiresInSeconds = resolveExpirySeconds();
    if (expiresInSeconds !== null) {
      if (
        !Number.isInteger(expiresInSeconds) ||
        expiresInSeconds < 1 ||
        expiresInSeconds > MAX_EXPIRY_SECONDS
      ) {
        setError(
          `Expiry duration must be a whole number between 1 and ${MAX_EXPIRY_SECONDS.toLocaleString()} seconds.`
        );
        return;
      }
    }

    let maxViews: number | null = null;
    if (maxViewsInput.trim() !== "") {
      const parsedViews = Number(maxViewsInput);
      if (
        !Number.isInteger(parsedViews) ||
        parsedViews < 1 ||
        parsedViews > MAX_VIEWS_LIMIT
      ) {
        setError(
          `Maximum views must be a whole number between 1 and ${MAX_VIEWS_LIMIT.toLocaleString()}.`
        );
        return;
      }
      maxViews = parsedViews;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/pastes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          expiresInSeconds,
          maxViews,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "Failed to create paste. Please try again.");
        return;
      }

      setCreatedPaste(data as CreatedPaste);
    } catch {
      setError("Network error while saving your paste. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setContent("");
    setExpiryPreset("");
    setCustomExpirySeconds("");
    setMaxViewsInput("");
    setError(null);
    setCreatedPaste(null);
  }

  if (createdPaste) {
    return (
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-zinc-100">
              Paste created
            </h1>
            <p className="text-sm text-zinc-400">
              Share this link with anyone. Viewing this link will count toward
              any configured view limit.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            type="text"
            readOnly
            value={createdPaste.url}
            aria-label="Shareable paste URL"
            onClick={(e) => e.currentTarget.select()}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm font-mono text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          />
          <div className="flex items-center gap-2">
            <CopyButton
              text={createdPaste.url}
              label="Copy URL"
              copiedLabel="Copied!"
              className="py-2.5 px-4"
            />
            <Link
              href={`/p/${createdPaste.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
            >
              <span>Open</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            {createdPaste.expiresAt
              ? `Expires ${new Date(createdPaste.expiresAt).toLocaleString()}`
              : "No time expiry"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-zinc-500" />
            {createdPaste.maxViews !== null
              ? `Max ${createdPaste.maxViews} view${createdPaste.maxViews === 1 ? "" : "s"}`
              : "Unlimited views"}
          </span>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create another paste
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          Create a New Paste
        </h1>
        <p className="text-sm text-zinc-400">
          Paste text or code below to generate a unique shareable link.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="paste-content"
            className="block text-sm font-medium text-zinc-200"
          >
            Content
          </label>
          <span
            className={`text-xs font-mono ${
              content.length > MAX_CONTENT_LENGTH
                ? "text-red-400"
                : "text-zinc-500"
            }`}
          >
            {content.length.toLocaleString("en-US")} /{" "}
{MAX_CONTENT_LENGTH.toLocaleString("en-US")}
          </span>
        </div>

        <textarea
          id="paste-content"
          name="content"
          rows={14}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your text, logs, JSON, or code snippet here..."
          disabled={isSubmitting}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 resize-y min-h-[260px]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
        <div className="space-y-2">
          <label
            htmlFor="paste-expiry"
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
          >
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            Expiration (optional)
          </label>
          <select
            id="paste-expiry"
            value={expiryPreset}
            onChange={(e) => setExpiryPreset(e.target.value)}
            disabled={isSubmitting}
            className="w-full rounded-lg border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
          >
            {EXPIRY_PRESETS.map((preset) => (
              <option key={preset.label} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>

          {expiryPreset === "custom" && (
            <input
              type="number"
              min={1}
              max={MAX_EXPIRY_SECONDS}
              value={customExpirySeconds}
              onChange={(e) => setCustomExpirySeconds(e.target.value)}
              placeholder="Duration in seconds (e.g. 120)"
              aria-label="Custom expiry duration in seconds"
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="paste-max-views"
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-300"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-400" />
            Max Views (optional)
          </label>
          <input
            id="paste-max-views"
            type="number"
            min={1}
            max={MAX_VIEWS_LIMIT}
            step={1}
            value={maxViewsInput}
            onChange={(e) => setMaxViewsInput(e.target.value)}
            placeholder="Unlimited"
            disabled={isSubmitting}
            className="w-full rounded-lg border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
          />
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed px-5 py-2.5 text-sm font-medium text-white transition-colors w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Paste...</span>
            </>
          ) : (
            <span>Create Paste</span>
          )}
        </button>
      </div>
    </form>
  );
}
