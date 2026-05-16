import type { Supplier } from "@/lib/types/types";

// ─── Supplier categories ──────────────────────────────────────────────────────

export const CATEGORIES = [
  "Automotive",
  "Chemicals",
  "Electronics",
  "Food & Beverage",
  "Logistics",
  "Metals & Mining",
  "Pharmaceuticals",
  "Textiles",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// ─── Countries ────────────────────────────────────────────────────────────────

export const COUNTRIES = [
  "Australia",
  "Bangladesh",
  "Brazil",
  "Canada",
  "China",
  "France",
  "Germany",
  "India",
  "Indonesia",
  "Italy",
  "Japan",
  "Malaysia",
  "Mexico",
  "Netherlands",
  "Pakistan",
  "Poland",
  "Singapore",
  "South Korea",
  "Spain",
  "Sweden",
  "Taiwan",
  "Thailand",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
  "Other",
] as const;

export type Country = (typeof COUNTRIES)[number];

// ─── Criticality levels ───────────────────────────────────────────────────────

export const CRITICALITY_LEVELS = [
  "low",
  "medium",
  "high",
  "critical",
] as const satisfies readonly Supplier["criticality"][];

/** Human-readable labels for display in dropdowns and badges. */
export const CRITICALITY_LABELS: Record<Supplier["criticality"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

// ─── Alert thresholds ─────────────────────────────────────────────────────────

/** Preset threshold values shown in the Add Supplier form slider. */
export const ALERT_THRESHOLD_PRESETS = [20, 30, 40, 50, 60] as const;

export const DEFAULT_ALERT_THRESHOLD = 40;

// ─── Score tiers ──────────────────────────────────────────────────────────────

export const SCORE_TIERS = {
  healthy: { min: 70, max: 100, label: "Healthy" },
  atRisk: { min: 40, max: 69, label: "At Risk" },
  critical: { min: 0, max: 39, label: "Critical" },
} as const;

// ─── Signal types ─────────────────────────────────────────────────────────────

export const SIGNAL_TYPES = [
  "news",
  "legal",
  "financial",
  "leadership",
  "operational",
] as const;

export const SIGNAL_SEVERITIES = ["low", "medium", "high", "critical"] as const;

// ─── Monitoring frequencies (by plan tier) ────────────────────────────────────

export const SCAN_FREQUENCY = {
  starter: "Weekly",
  pro: "Daily",
  enterprise: "Every 6 hours",
} as const;

// ─── Navigation ───────────────────────────────────────────────────────────────

export const NAV_HREFS = {
  dashboard: "/dashboard",
  addSupplier: "/suppliers/new",
  alerts: "/alerts",
  login: "/login",
  signup: "/signup",
} as const;
