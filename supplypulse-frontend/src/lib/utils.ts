import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import type { Signal, SupplierScore } from "@/lib/types/types";

// ─── Score colour ─────────────────────────────────────────────────────────────

/**
 * Returns a Tailwind colour token set for a 0-100 health score.
 * Each object contains: text, bg, border, badge (bg + text combo for pills).
 */
export function getScoreColor(score: number) {
  if (score >= 70) {
    return {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      badge: "bg-emerald-100 text-emerald-700",
      dot: "bg-emerald-500",
      ring: "ring-emerald-200",
    } as const;
  }
  if (score >= 40) {
    return {
      text: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
      ring: "ring-amber-200",
    } as const;
  }
  return {
    text: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
    ring: "ring-red-200",
  } as const;
}

// ─── Score tier label ─────────────────────────────────────────────────────────

export function getScoreTier(score: number): "Healthy" | "At Risk" | "Critical" {
  if (score >= 70) return "Healthy";
  if (score >= 40) return "At Risk";
  return "Critical";
}

// ─── Direction icon ───────────────────────────────────────────────────────────

interface DirectionMeta {
  icon: LucideIcon;
  label: string;
  className: string;
}

export function getDirectionMeta(
  direction: SupplierScore["direction"]
): DirectionMeta {
  switch (direction) {
    case "improving":
      return {
        icon: TrendingUp,
        label: "Improving",
        className: "text-emerald-500",
      };
    case "deteriorating":
      return {
        icon: TrendingDown,
        label: "Deteriorating",
        className: "text-red-500",
      };
    case "stable":
    default:
      return {
        icon: Minus,
        label: "Stable",
        className: "text-slate-400",
      };
  }
}

// ─── Date formatting ──────────────────────────────────────────────────────────

/**
 * Returns a relative string ("2 days ago", "just now") for recent dates,
 * falling back to "MMM D, YYYY" for anything older than 7 days.
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1_000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Signal severity colour ───────────────────────────────────────────────────

/**
 * Returns badge classes for a signal severity level.
 * Intentionally separate from getScoreColor so severity badges
 * can be styled independently (e.g. "critical" signal ≠ "critical" score).
 */
export function getSeverityColor(severity: Signal["severity"]) {
  switch (severity) {
    case "critical":
      return {
        badge: "bg-red-100 text-red-700 ring-1 ring-red-200",
        dot: "bg-red-500",
        text: "text-red-600",
      } as const;
    case "high":
      return {
        badge: "bg-orange-100 text-orange-700 ring-1 ring-orange-200",
        dot: "bg-orange-500",
        text: "text-orange-600",
      } as const;
    case "medium":
      return {
        badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
        dot: "bg-amber-500",
        text: "text-amber-600",
      } as const;
    case "low":
    default:
      return {
        badge: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
        dot: "bg-slate-400",
        text: "text-slate-500",
      } as const;
  }
}

// ─── Signal type label ────────────────────────────────────────────────────────

export function getSignalTypeLabel(type: Signal["type"]): string {
  const labels: Record<Signal["type"], string> = {
    news: "News",
    legal: "Legal",
    financial: "Financial",
    leadership: "Leadership",
    operational: "Operational",
  };
  return labels[type] ?? type;
}

// ─── Criticality colour ───────────────────────────────────────────────────────

export function getCriticalityColor(
  criticality: "low" | "medium" | "high" | "critical"
) {
  switch (criticality) {
    case "critical":
      return "bg-red-100 text-red-700 ring-1 ring-red-200";
    case "high":
      return "bg-orange-100 text-orange-700 ring-1 ring-orange-200";
    case "medium":
      return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
    case "low":
    default:
      return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
  }
}

// ─── Score delta ──────────────────────────────────────────────────────────────

/**
 * Formats the point change between two scores with a sign prefix.
 * e.g. scoreDelta(82, 65) → "+17"  |  scoreDelta(40, 55) → "-15"
 */
export function scoreDelta(current: number, previous: number): string {
  const delta = current - previous;
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}
