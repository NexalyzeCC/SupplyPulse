"use client";

import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, BarChart2 } from "lucide-react";
import type { SupplierScore } from "@/lib/types/types";
import { getScoreColor, getScoreTier } from "@/lib/utils";

// ─── Chart point ──────────────────────────────────────────────────────────────

interface ChartPoint {
  dateLabel: string;
  fullDate: string;
  score: number;
  direction: SupplierScore["direction"];
}

function toChartPoints(scores: SupplierScore[]): ChartPoint[] {
  return scores.map((s) => {
    const d = new Date(s.created_at);
    return {
      dateLabel: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      fullDate: d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      score: s.score,
      direction: s.direction,
    };
  });
}

// ─── Score zone → stroke / fill colours ──────────────────────────────────────

function zoneStyle(score: number) {
  if (score >= 70)
    return { stroke: "#10b981", fill: "#10b981", stopColor: "#10b981" }; // emerald
  if (score >= 40)
    return { stroke: "#f59e0b", fill: "#f59e0b", stopColor: "#f59e0b" }; // amber
  return { stroke: "#ef4444", fill: "#ef4444", stopColor: "#ef4444" };    // red
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const pt = payload[0].payload as ChartPoint;
  const colors = getScoreColor(pt.score);
  const tier = getScoreTier(pt.score);

  const DirIcon =
    pt.direction === "improving"
      ? TrendingUp
      : pt.direction === "deteriorating"
        ? TrendingDown
        : Minus;

  const dirClass =
    pt.direction === "improving"
      ? "text-emerald-500"
      : pt.direction === "deteriorating"
        ? "text-red-500"
        : "text-slate-400";

  const dirLabel =
    pt.direction === "improving"
      ? "Improving"
      : pt.direction === "deteriorating"
        ? "Deteriorating"
        : "Stable";

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-xl">
      <p className="mb-1.5 text-[11px] text-slate-400">{pt.fullDate}</p>

      {/* Score */}
      <p className={`text-2xl font-extrabold tabular-nums leading-none ${colors.text}`}>
        {pt.score}
        <span className="ml-1 text-xs font-medium opacity-50">/ 100</span>
      </p>

      {/* Tier badge */}
      <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors.badge}`}>
        {tier}
      </span>

      {/* Direction */}
      <div className={`mt-2 flex items-center gap-1 text-xs font-medium ${dirClass}`}>
        <DirIcon className="h-3.5 w-3.5" />
        {dirLabel}
      </div>
    </div>
  );
}

// ─── Time window selector ─────────────────────────────────────────────────────

type Window = 30 | 60 | 90;
const WINDOWS: Window[] = [30, 60, 90];

function filterByWindow(points: ChartPoint[], scores: SupplierScore[], days: Window) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered: ChartPoint[] = [];
  scores.forEach((s, i) => {
    if (new Date(s.created_at).getTime() >= cutoff) {
      filtered.push(points[i]);
    }
  });
  return filtered;
}

// ─── Empty / single-point states ──────────────────────────────────────────────

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      style={{ height }}
      className="flex flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 text-center"
    >
      <BarChart2 className="h-8 w-8 text-slate-300" />
      <p className="text-sm font-medium text-slate-400">No scan history yet</p>
      <p className="text-xs text-slate-400">
        Trigger a scan to start building the trajectory.
      </p>
    </div>
  );
}

function SinglePointState({
  point,
  height,
}: {
  point: ChartPoint;
  height: number;
}) {
  const colors = getScoreColor(point.score);
  const tier = getScoreTier(point.score);
  return (
    <div
      style={{ height }}
      className={`flex flex-col items-center justify-center gap-3 rounded-xl border ${colors.border} ${colors.bg}`}
    >
      <p className={`text-4xl font-extrabold tabular-nums ${colors.text}`}>
        {point.score}
        <span className="ml-1 text-sm font-medium opacity-60">/ 100</span>
      </p>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors.badge}`}>
        {tier}
      </span>
      <p className="max-w-[220px] text-center text-xs text-slate-500">
        First scan recorded on {point.fullDate}. More data points will appear
        after daily scans.
      </p>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TrajectoryChartProps {
  scores: SupplierScore[];
  threshold?: number;
  height?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TrajectoryChart({
  scores,
  threshold,
  height = 240,
}: TrajectoryChartProps) {
  const [window, setWindow] = useState<Window>(90);

  // All chart points (memo to avoid recomputing on window change)
  const allPoints = useMemo(() => toChartPoints(scores), [scores]);

  // Filtered to selected window
  const data = useMemo(
    () =>
      scores.length === 0
        ? []
        : filterByWindow(allPoints, scores, window),
    [allPoints, scores, window],
  );

  // ── Empty states ──
  if (scores.length === 0) return <EmptyChart height={height} />;
  if (scores.length === 1)
    return <SinglePointState point={allPoints[0]} height={height} />;

  // Even if window filter removes all but 1, show the single-point state
  if (data.length === 1)
    return <SinglePointState point={data[0]} height={height} />;

  // ── Derived styling from latest visible point ──
  const latest = data[data.length - 1];
  const style = zoneStyle(latest.score);
  const gradId = "traj-fill";

  // X-axis interval: show ~6 labels regardless of density
  const tickInterval =
    data.length <= 7 ? 0 : Math.ceil(data.length / 6) - 1;

  return (
    <div>
      {/* Time window tabs */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-slate-400">
          {data.length} scan{data.length !== 1 ? "s" : ""} in window
        </p>
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={[
                "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
                window === w
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              ].join(" ")}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: -20 }}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={style.stopColor}
                stopOpacity={0.2}
              />
              <stop
                offset="95%"
                stopColor={style.stopColor}
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>

          {/* Zone bands */}
          <ReferenceArea y1={70} y2={100} fill="#d1fae5" fillOpacity={0.4} />
          <ReferenceArea y1={40} y2={70}  fill="#fef9c3" fillOpacity={0.4} />
          <ReferenceArea y1={0}  y2={40}  fill="#fee2e2" fillOpacity={0.4} />

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />

          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            ticks={[0, 25, 40, 70, 100]}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "#cbd5e1", strokeWidth: 1, strokeDasharray: "3 3" }}
          />

          {/* Alert threshold */}
          {threshold !== undefined && (
            <ReferenceLine
              y={threshold}
              stroke="#f87171"
              strokeDasharray="5 4"
              strokeWidth={1.5}
              label={{
                value: `▸ Alert ${threshold}`,
                position: "insideBottomRight",
                fontSize: 10,
                fill: "#f87171",
                dy: -4,
              }}
            />
          )}

          <Area
            type="monotone"
            dataKey="score"
            stroke={style.stroke}
            strokeWidth={2.5}
            fill={`url(#${gradId})`}
            dot={{ r: 3, fill: style.fill, strokeWidth: 0 }}
            activeDot={{
              r: 6,
              fill: style.fill,
              stroke: "#fff",
              strokeWidth: 2,
              style: { filter: "drop-shadow(0 0 4px rgba(0,0,0,0.15))" },
            }}
            isAnimationActive
            animationDuration={500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Zone legend */}
      <div className="mt-3 flex items-center justify-center gap-4">
        {[
          { label: "Healthy (70–100)", dot: "bg-emerald-400" },
          { label: "At Risk (40–69)", dot: "bg-amber-400" },
          { label: "Critical (0–39)", dot: "bg-red-400" },
        ].map(({ label, dot }) => (
          <span key={label} className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className={`h-2 w-2 rounded-full ${dot}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
