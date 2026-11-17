import Link from "next/link";
import { AlertTriangle, Clock, EyeOff, FileQuestion, Plus } from "lucide-react";

type UnavailableReason =
  | "INVALID_ID"
  | "NOT_FOUND"
  | "EXPIRED"
  | "VIEW_LIMIT_EXHAUSTED"
  | "SERVER_ERROR";

type PasteUnavailableProps = {
  reason: UnavailableReason;
};

const REASON_COPY: Record<
  UnavailableReason,
  { title: string; description: string; code: string }
> = {
  INVALID_ID: {
    code: "400",
    title: "Invalid Paste Link",
    description:
      "The paste ID in this URL is malformed. Please check that you copied the full link.",
  },
  NOT_FOUND: {
    code: "404",
    title: "Paste Not Found",
    description:
      "No paste exists with this ID. It may have been mistyped or never created.",
  },
  EXPIRED: {
    code: "410",
    title: "Paste Expired",
    description:
      "This paste has passed its expiration time and is no longer accessible.",
  },
  VIEW_LIMIT_EXHAUSTED: {
    code: "410",
    title: "View Limit Reached",
    description:
      "This paste has reached its maximum allowed number of views and is no longer accessible.",
  },
  SERVER_ERROR: {
    code: "500",
    title: "Unable to Load Paste",
    description:
      "A temporary server error occurred while retrieving this paste. Please try again shortly.",
  },
};

export function PasteUnavailable({ reason }: PasteUnavailableProps) {
  const info = REASON_COPY[reason];

  const Icon =
    reason === "EXPIRED"
      ? Clock
      : reason === "VIEW_LIMIT_EXHAUSTED"
        ? EyeOff
        : reason === "NOT_FOUND"
          ? FileQuestion
          : AlertTriangle;

  return (
    <section className="max-w-lg mx-auto my-10 rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 text-center space-y-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 mx-auto">
        <Icon className="w-6 h-6" />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">
          HTTP {info.code}
        </p>
        <h1 className="text-xl font-semibold text-zinc-100">{info.title}</h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          {info.description}
        </p>
      </div>

      <div className="pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create a New Paste</span>
        </Link>
      </div>
    </section>
  );
}
