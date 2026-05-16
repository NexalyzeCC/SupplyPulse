"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import ScanButton from "@/components/suppliers/ScanButton";
import {
  getScoreColor,
  getScoreTier,
  getDirectionMeta,
  getCriticalityColor,
  formatDate,
} from "@/lib/utils";
import type { SupplierWithScore } from "@/lib/types/types";

// ─── Country → emoji flag map ─────────────────────────────────────────────────

const FLAG: Record<string, string> = {
  Australia: "🇦🇺",
  Bangladesh: "🇧🇩",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  China: "🇨🇳",
  France: "🇫🇷",
  Germany: "🇩🇪",
  India: "🇮🇳",
  Indonesia: "🇮🇩",
  Italy: "🇮🇹",
  Japan: "🇯🇵",
  Malaysia: "🇲🇾",
  Mexico: "🇲🇽",
  Netherlands: "🇳🇱",
  Pakistan: "🇵🇰",
  Poland: "🇵🇱",
  Singapore: "🇸🇬",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
  Taiwan: "🇹🇼",
  Thailand: "🇹🇭",
  Turkey: "🇹🇷",
  "United Arab Emirates": "🇦🇪",
  "United Kingdom": "🇬🇧",
  "United States": "🇺🇸",
  Vietnam: "🇻🇳",
};

function countryFlag(country: string | null): string {
  if (!country) return "";
  return FLAG[country] ?? "🌐";
}

// ─── Criticality dot ──────────────────────────────────────────────────────────

const CRIT_DOT: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  supplier: SupplierWithScore;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SupplierCard({ supplier }: Props) {
  const { latestScore } = supplier;

  const colors = latestScore ? getScoreColor(latestScore.score) : null;
  const tier = latestScore ? getScoreTier(latestScore.score) : null;
  const dir = latestScore ? getDirectionMeta(latestScore.direction) : null;
  const critBadge = getCriticalityColor(supplier.criticality);
  const critDot = CRIT_DOT[supplier.criticality] ?? "bg-slate-400";
  const flag = countryFlag(supplier.country);

  return (
    /*
     * Card link pattern: a <Link> with absolute inset-0 covers the entire
     * card, making the whole surface clickable. Interactive elements (Scan
     * button) use relative + z-10 to sit above the invisible overlay.
     */
    <article
      className={`
        group relative flex flex-col overflow-hidden rounded-2xl border
        bg-white shadow-sm transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-lg
        dark:bg-slate-800 dark:shadow-slate-900
        ${colors ? colors.border : "border-slate-200 dark:border-slate-700"}
      `}
    >
      {/* ── Invisible full-card link ── */}
      <Link
        href={`/suppliers/${supplier.id}`}
        className="absolute inset-0 z-0"
        aria-label={`View details for ${supplier.name}`}
      />

      {/* ── Risk colour band ── */}
      <div className={`h-1 w-full ${colors ? colors.dot : "bg-slate-200"}`} />

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col gap-3 p-5">

        {/* ── Top row: score circle + name block ── */}
        <div className="flex items-start gap-4">

          {/* Score circle */}
          <div
            className={`
              relative flex h-16 w-16 shrink-0 flex-col items-center
              justify-center rounded-full ring-4
              ${colors
                ? `${colors.bg} ${colors.text} ${colors.ring}`
                : "bg-slate-100 text-slate-400 ring-slate-200"
              }
            `}
          >
            {latestScore ? (
              <>
                <span className="text-2xl font-extrabold tabular-nums leading-none">
                  {latestScore.score}
                </span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-60">
                  /100
                </span>
              </>
            ) : (
              <span className="text-xs font-semibold">N/A</span>
            )}
          </div>

          {/* Name + country + category */}
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-base font-bold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
              {supplier.name}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              {supplier.country && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <span aria-hidden>{flag}</span>
                  {supplier.country}
                </span>
              )}
              {supplier.country && supplier.category && (
                <span className="text-slate-300 dark:text-slate-600">·</span>
              )}
              {supplier.category && (
                <span className="text-xs text-slate-500 dark:text-slate-400">{supplier.category}</span>
              )}
            </div>

            {/* Criticality indicator */}
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${critDot}`} />
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${critBadge}`}
              >
                {supplier.criticality} criticality
              </span>
            </div>
          </div>
        </div>

        {/* ── Status row: tier pill + direction arrow ── */}
        {(tier || dir) && (
          <div className="flex items-center gap-2">
            {tier && colors && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.badge}`}
              >
                {tier}
              </span>
            )}
            {dir && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium ${dir.className}`}
              >
                <dir.icon className="h-3.5 w-3.5" aria-hidden />
                {dir.label}
              </span>
            )}
          </div>
        )}

        {/* ── Summary excerpt ── */}
        {latestScore?.summary && (
          <p className="line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {latestScore.summary}
          </p>
        )}

        {/* ── Footer: timestamp + actions ── */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
          <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
            <Clock className="h-3 w-3 shrink-0" aria-hidden />
            {latestScore
              ? `Scanned ${formatDate(latestScore.created_at)}`
              : "Never scanned"}
          </span>

          <div className="relative z-10 flex items-center gap-2">
            <div onClick={(e) => e.stopPropagation()}>
              <ScanButton supplierId={supplier.id} size="sm" />
            </div>

            {/* View details — visible CTA above the card-link overlay */}
            <Link
              href={`/suppliers/${supplier.id}`}
              onClick={(e) => e.stopPropagation()}
              className={`
                inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5
                text-xs font-semibold transition-colors
                ${colors
                  ? `${colors.bg} ${colors.text} hover:opacity-80`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }
              `}
            >
              Details →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
