import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Tag,
  Clock,
  Pencil,
} from "lucide-react";
import ScanButton from "@/components/suppliers/ScanButton";
import { createClient } from "@/lib/supabase/server";
import AlertBadge from "@/components/common/AlertBadge";
import TrajectoryChart from "@/components/charts/TrajectoryChart";
import SignalFeed from "@/components/signals/SignalFeed";
import RecommendationPanel from "@/components/common/RecommendationPanel";
import {
  getScoreColor,
  getScoreTier,
  getDirectionMeta,
  getCriticalityColor,
  formatDate,
  scoreDelta,
} from "@/lib/utils";
import type { Signal, SupplierScore } from "@/lib/types/types";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getSupplierDetail(id: string) {
  const supabase = await createClient();

  // Fetch supplier — RLS ensures the row is invisible if it belongs to another user
  const { data: supplier } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  if (!supplier) return null;

  // All scores ordered oldest → newest for the trajectory chart (max 90 points)
  const { data: scores } = await supabase
    .from("supplier_scores")
    .select("id, score, direction, summary, recommendations, created_at")
    .eq("supplier_id", id)
    .order("created_at", { ascending: true })
    .limit(90);

  const allScores = (scores ?? []) as SupplierScore[];
  const latestScore = allScores.length > 0
    ? allScores[allScores.length - 1]
    : null;

  // Signals belong to the latest score only
  const { data: signals } = latestScore
    ? await supabase
        .from("supplier_signals")
        .select("*")
        .eq("score_id", latestScore.id)
        .order("severity", { ascending: false }) // critical first
        .order("confidence", { ascending: false })
    : { data: [] };

  return {
    supplier,
    allScores,
    latestScore,
    signals: (signals ?? []) as Signal[],
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getSupplierDetail(id);

  if (!detail) notFound();

  const { supplier, allScores, latestScore, signals } = detail;

  const colors = latestScore ? getScoreColor(latestScore.score) : null;
  const tier = latestScore ? getScoreTier(latestScore.score) : null;
  const dir = latestScore ? getDirectionMeta(latestScore.direction) : null;
  const critClass = getCriticalityColor(supplier.criticality);

  // Point delta vs the previous scan
  const prevScore = allScores.length >= 2
    ? allScores[allScores.length - 2]
    : null;
  const delta = latestScore && prevScore
    ? scoreDelta(latestScore.score, prevScore.score)
    : null;

  return (
    <div className="space-y-6">

      {/* ── Back link ── */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      {/* ── Hero card ── */}
      <div className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900/60 dark:shadow-black/25 ${colors ? colors.border : "border-slate-200 dark:border-slate-800"}`}>
        {/* Colour band */}
        <div className={`h-1.5 w-full ${colors ? colors.dot : "bg-slate-200 dark:bg-slate-700"}`} />

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">

          {/* Left: name + meta */}
          <div className="flex items-start gap-5">
            <AlertBadge
              score={latestScore?.score ?? 0}
              size="lg"
              showLabel
            />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {supplier.name}
                </h1>
                {tier && colors && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors.badge}`}>
                    {tier}
                  </span>
                )}
              </div>

              {/* Meta row */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                {supplier.country && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {supplier.country}
                  </span>
                )}
                {supplier.category && (
                  <span className="flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 shrink-0" />
                    {supplier.category}
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${critClass}`}>
                  {supplier.criticality}
                </span>
              </div>

              {/* Direction + delta */}
              {dir && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${dir.className}`}>
                    <dir.icon className="h-4 w-4" />
                    {dir.label}
                  </span>
                  {delta && (
                    <span className={`text-sm font-semibold tabular-nums ${
                      delta.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" :
                      delta.startsWith("-") ? "text-red-600 dark:text-red-400" :
                      "text-slate-400 dark:text-slate-500"
                    }`}>
                      {delta} pts since last scan
                    </span>
                  )}
                </div>
              )}

              {/* Last scanned */}
              <p className="mt-2 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <Clock className="h-3 w-3 shrink-0" />
                {latestScore
                  ? `Last scanned ${formatDate(latestScore.created_at)}`
                  : "Never scanned — trigger a scan to generate a score"}
              </p>
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <ScanButton supplierId={supplier.id} />

            <Link
              href={`/suppliers/${supplier.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* ── 2-column grid ── */}
      <div className="grid gap-6 lg:grid-cols-12">

        {/* ── Left column: chart + summary ── */}
        <div className="space-y-6 lg:col-span-7">

          {/* Trajectory chart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-black/25">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Score trajectory
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {allScores.length} scan{allScores.length !== 1 ? "s" : ""} recorded
                </p>
              </div>
              {latestScore && (
                <span className={`text-3xl font-extrabold tabular-nums ${colors!.text}`}>
                  {latestScore.score}
                </span>
              )}
            </div>
            <TrajectoryChart
              scores={allScores}
              threshold={supplier.alert_threshold}
            />
          </div>

          {/* AI summary */}
          {latestScore?.summary && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 dark:shadow-black/25">
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                AI assessment
              </h2>
              <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                {latestScore.summary}
              </p>
              <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                Generated {formatDate(latestScore.created_at)} · Not financial
                or legal advice
              </p>
            </div>
          )}
        </div>

        {/* ── Right column: signals + recommendations ── */}
        <div className="space-y-6 lg:col-span-5">
          <SignalFeed signals={signals} />
          <RecommendationPanel
            recommendations={latestScore?.recommendations ?? null}
            threshold={supplier.alert_threshold}
            currentScore={latestScore?.score ?? null}
          />
        </div>
      </div>
    </div>
  );
}
