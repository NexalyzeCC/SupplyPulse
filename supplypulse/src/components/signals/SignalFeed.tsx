"use client";

import { useState } from "react";
import {
  Newspaper,
  Scale,
  BarChart3,
  Users,
  Factory,
  ExternalLink,
  Radio,
} from "lucide-react";
import { getSeverityColor, getSignalTypeLabel, formatDate } from "@/lib/utils";
import type { Signal } from "@/lib/types/types";

// ─── Signal type metadata ─────────────────────────────────────────────────────

const TYPE_META: Record<
  Signal["type"],
  { icon: React.ElementType; badgeCls: string }
> = {
  news: {
    icon: Newspaper,
    badgeCls: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  },
  legal: {
    icon: Scale,
    badgeCls: "bg-purple-50 text-purple-700 ring-1 ring-purple-100",
  },
  financial: {
    icon: BarChart3,
    badgeCls: "bg-orange-50 text-orange-700 ring-1 ring-orange-100",
  },
  leadership: {
    icon: Users,
    badgeCls: "bg-pink-50 text-pink-700 ring-1 ring-pink-100",
  },
  operational: {
    icon: Factory,
    badgeCls: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100",
  },
};

// ─── Severity sort weight ─────────────────────────────────────────────────────

const SEV_WEIGHT: Record<Signal["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const barCls =
    pct >= 75
      ? "bg-emerald-400"
      : pct >= 50
        ? "bg-amber-400"
        : "bg-slate-300";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barCls}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-[10px] font-medium text-slate-400">
        {pct}%
      </span>
    </div>
  );
}

// ─── Signal card ──────────────────────────────────────────────────────────────

function SignalCard({ signal }: { signal: Signal }) {
  const sev = getSeverityColor(signal.severity);
  const type = TYPE_META[signal.type];
  const TypeIcon = type.icon;

  return (
    <article
      className={`
        rounded-xl border bg-white p-4 shadow-sm transition-shadow
        hover:shadow-md
        ${
          signal.severity === "critical"
            ? "border-red-200"
            : signal.severity === "high"
              ? "border-orange-200"
              : "border-slate-200"
        }
      `}
    >
      {/* ── Header row ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {/* Type icon bubble */}
          <div
            className={`
              mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center
              rounded-lg ${type.badgeCls}
            `}
          >
            <TypeIcon className="h-3.5 w-3.5" aria-hidden />
          </div>

          {/* Type label + severity badge */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${type.badgeCls}`}>
              {getSignalTypeLabel(signal.type)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${sev.badge}`}
            >
              {signal.severity}
            </span>
          </div>
        </div>

        {/* Signal date */}
        {signal.signal_date && (
          <span className="shrink-0 text-[10px] text-slate-400">
            {formatDate(signal.signal_date)}
          </span>
        )}
      </div>

      {/* ── Summary ── */}
      <p className="mt-2.5 text-sm leading-5 text-slate-700">
        {signal.summary}
      </p>

      {/* ── Source link ── */}
      {signal.source_url && (
        <a
          href={signal.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
          <span className="truncate max-w-[240px]">
            {signal.source_title ?? signal.source_url}
          </span>
        </a>
      )}

      {/* ── Confidence bar ── */}
      {signal.confidence > 0 && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1 text-[10px] font-medium text-slate-400">
            Confidence
          </p>
          <ConfidenceBar value={signal.confidence} />
        </div>
      )}
    </article>
  );
}

// ─── Type filter pill ─────────────────────────────────────────────────────────

type FilterType = "all" | Signal["type"];

function FilterPill({
  value,
  active,
  count,
  onClick,
}: {
  value: FilterType;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const label = value === "all" ? "All" : getSignalTypeLabel(value as Signal["type"]);
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
      ].join(" ")}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[9px] font-bold ${
          active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptySignals({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Radio className="h-8 w-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-400">
        {filtered ? "No signals match this filter" : "No signals detected"}
      </p>
      <p className="text-xs text-slate-400">
        {filtered
          ? "Try selecting a different signal type."
          : "The agent found no relevant risk signals in this scan."}
      </p>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface SignalFeedProps {
  signals: Signal[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SignalFeed({ signals }: SignalFeedProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Sort by severity (critical first), then confidence (highest first)
  const sorted = [...signals].sort((a, b) => {
    const sevDiff = SEV_WEIGHT[a.severity] - SEV_WEIGHT[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.confidence - a.confidence;
  });

  // Filter
  const filtered =
    activeFilter === "all"
      ? sorted
      : sorted.filter((s) => s.type === activeFilter);

  // Counts per type for filter pills
  const countByType = (type: FilterType) =>
    type === "all"
      ? signals.length
      : signals.filter((s) => s.type === type).length;

  // Only show filter pills for types that have at least one signal
  const activeTypes = (Object.keys(TYPE_META) as Signal["type"][]).filter(
    (t) => signals.some((s) => s.type === t),
  );

  const criticalCount = signals.filter((s) => s.severity === "critical").length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Risk signals</h2>
          <p className="text-xs text-slate-400">
            {signals.length === 0
              ? "No signals from this scan"
              : `${signals.length} signal${signals.length !== 1 ? "s" : ""} detected`}
          </p>
        </div>
        {criticalCount > 0 && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-200">
            {criticalCount} critical
          </span>
        )}
      </div>

      {/* ── Type filter (only rendered when >1 type present) ── */}
      {activeTypes.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-5 py-3">
          <FilterPill
            value="all"
            active={activeFilter === "all"}
            count={countByType("all")}
            onClick={() => setActiveFilter("all")}
          />
          {activeTypes.map((t) => (
            <FilterPill
              key={t}
              value={t}
              active={activeFilter === t}
              count={countByType(t)}
              onClick={() => setActiveFilter(t)}
            />
          ))}
        </div>
      )}

      {/* ── Cards ── */}
      <div className="space-y-3 p-4">
        {filtered.length === 0 ? (
          <EmptySignals filtered={activeFilter !== "all"} />
        ) : (
          filtered.map((signal) => (
            <SignalCard key={signal.id} signal={signal} />
          ))
        )}
      </div>
    </div>
  );
}
