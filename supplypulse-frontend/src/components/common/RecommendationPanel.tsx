"use client";

import { useState } from "react";
import { Lightbulb, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { getScoreColor } from "@/lib/utils";
import type { Recommendation } from "@/lib/types/types";

// ─── Priority metadata ────────────────────────────────────────────────────────

const PRIORITY_META: Record<
  number,
  { label: string; badgeCls: string; bubbleCls: string }
> = {
  1: {
    label: "Immediate",
    badgeCls:
      "bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-950/45 dark:text-red-300 dark:ring-red-900/55",
    bubbleCls: "bg-red-600 text-white dark:bg-red-600",
  },
  2: {
    label: "Short-term",
    badgeCls:
      "bg-amber-100 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/35 dark:text-amber-300 dark:ring-amber-900/50",
    bubbleCls: "bg-amber-500 text-white dark:bg-amber-500",
  },
  3: {
    label: "Medium-term",
    badgeCls:
      "bg-blue-100 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900/50",
    bubbleCls: "bg-blue-600 text-white dark:bg-blue-500",
  },
};

function priorityMeta(priority: number) {
  return (
    PRIORITY_META[priority] ?? {
      label: `Priority ${priority}`,
      badgeCls:
        "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600",
      bubbleCls:
        "bg-slate-700 text-white dark:bg-slate-600 dark:text-white",
    }
  );
}

// ─── Single recommendation item ───────────────────────────────────────────────

function RecommendationItem({
  rec,
  done,
  onToggleDone,
}: {
  rec: Recommendation;
  done: boolean;
  onToggleDone: () => void;
}) {
  const [rationaleOpen, setRationaleOpen] = useState(false);
  const meta = priorityMeta(rec.priority);

  return (
    <li
      className={`
        rounded-xl border p-4 transition-colors
        ${done
          ? "border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"
          : "border-slate-200 bg-white shadow-sm hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60 dark:hover:shadow-black/25"
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Priority number bubble */}
        <div
          className={`
            flex h-6 w-6 shrink-0 items-center justify-center
            rounded-full text-[11px] font-bold
            ${done ? "bg-slate-300 text-white dark:bg-slate-600" : meta.bubbleCls}
          `}
          aria-label={`Priority ${rec.priority}`}
        >
          {rec.priority}
        </div>

        <div className="min-w-0 flex-1">
          {/* Priority badge */}
          <span
            className={`
              rounded-full px-2 py-0.5 text-[10px] font-semibold
              ${done ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" : meta.badgeCls}
            `}
          >
            {meta.label}
          </span>

          {/* Action text + checkbox row */}
          <div className="mt-2 flex items-start gap-2.5">
            {/* Checkbox */}
            <button
              type="button"
              role="checkbox"
              aria-checked={done}
              onClick={onToggleDone}
              aria-label={done ? "Mark as not done" : "Mark as done"}
              className={`
                mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center
                rounded border-2 transition-colors
                ${done
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-slate-300 hover:border-blue-400 dark:border-slate-600 dark:hover:border-blue-400"
                }
              `}
            >
              {done && (
                <svg
                  viewBox="0 0 10 8"
                  className="h-2.5 w-2.5 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 4l3 3 5-6" />
                </svg>
              )}
            </button>

            {/* Action */}
            <p
              className={`
                text-sm font-medium leading-5 transition-colors
                ${done
                  ? "text-slate-400 line-through decoration-slate-300 dark:text-slate-500 dark:decoration-slate-600"
                  : "text-slate-800 dark:text-slate-100"
                }
              `}
            >
              {rec.action}
            </p>
          </div>

          {/* Rationale toggle */}
          {rec.rationale && (
            <div className="mt-2 pl-6">
              <button
                type="button"
                onClick={() => setRationaleOpen((o) => !o)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                aria-expanded={rationaleOpen}
              >
                {rationaleOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Why?
              </button>

              {rationaleOpen && (
                <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {rec.rationale}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Lightbulb className="h-8 w-8 text-slate-300 dark:text-slate-600" />
      <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
        No action plan yet
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Scan this supplier to generate AI-powered recommendations.
      </p>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RecommendationPanelProps {
  recommendations: Recommendation[] | null;
  currentScore: number | null;
  threshold: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RecommendationPanel({
  recommendations,
  currentScore,
  threshold,
}: RecommendationPanelProps) {
  const sorted = recommendations
    ? [...recommendations].sort((a, b) => a.priority - b.priority)
    : [];

  // Local "done" tracking — visual only, no persistence in v1.
  // Keyed by index in the sorted list because the LLM can return multiple
  // recommendations sharing the same `priority` value, so priority is not a
  // safe identity key (it would visually toggle siblings together).
  const [done, setDone] = useState<Set<number>>(new Set());

  function toggleDone(index: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  const completedCount = done.size;
  const totalCount = sorted.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const showAlert = currentScore !== null && currentScore < threshold;
  const alertColors =
    showAlert && currentScore !== null ? getScoreColor(currentScore) : null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-black/25">
      {/* ── Header ── */}
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Action plan
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {totalCount === 0
                ? "AI-generated once a scan completes"
                : `${completedCount} of ${totalCount} completed`}
            </p>
          </div>

          {/* Progress ring placeholder — simple text fraction */}
          {totalCount > 0 && (
            <span
              className={`
                rounded-full px-2.5 py-0.5 text-xs font-semibold
                ${allDone
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                }
              `}
            >
              {allDone ? "All done ✓" : `${completedCount}/${totalCount}`}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        {/* Alert banner */}
        {showAlert && alertColors && (
          <div
            className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 ${alertColors.border} ${alertColors.bg}`}
            role="alert"
          >
            <AlertTriangle
              className={`mt-0.5 h-4 w-4 shrink-0 ${alertColors.text}`}
            />
            <p className={`text-xs leading-5 ${alertColors.text}`}>
              Score ({currentScore}) is below your alert threshold ({threshold}).
              Address priority&nbsp;1 actions immediately.
            </p>
          </div>
        )}

        {/* Items */}
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <ol className="space-y-2.5" aria-label="Recommended actions">
              {sorted.map((rec, i) => (
                <RecommendationItem
                  key={`${rec.priority}-${i}`}
                  rec={rec}
                  done={done.has(i)}
                  onToggleDone={() => toggleDone(i)}
                />
              ))}
            </ol>

            {/* Disclaimer */}
            <p className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
              AI-generated · Not financial or legal advice · Validate with your
              procurement team before acting.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
