/**
 * Single source of truth for subscription tier metadata.
 * Kept in sync with TIER_LIMITS in netlify/functions/suppliers.js and
 * the price → tier map in netlify/functions/lib/stripe-tiers.js.
 */

export type Tier = "starter" | "pro" | "enterprise";

export interface PlanMeta {
  id:           Tier;
  name:         string;
  /**
   * Display price for the marketing UI. The actual amount charged is set in
   * Stripe — this is purely cosmetic. Keep in sync with the Stripe Price you
   * point at via `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ENTERPRISE`.
   */
  priceUsd:     number;
  /** Maximum suppliers a user on this plan can watchlist. */
  supplierLimit: number;
  /** Human-readable scan cadence. */
  scanFrequency: string;
  /** Tagline shown under the plan name. */
  tagline:      string;
  /** Feature bullets shown on the plan card. */
  features:     string[];
}

export const PLANS: Record<Tier, PlanMeta> = {
  starter: {
    id:            "starter",
    name:          "Starter",
    priceUsd:      0,
    supplierLimit: 3,
    scanFrequency: "Weekly (Mondays)",
    tagline:       "For exploring the product.",
    features: [
      "Up to 3 suppliers",
      "Weekly automated scans",
      "Email alerts",
      "Score history",
    ],
  },
  pro: {
    id:            "pro",
    name:          "Pro",
    priceUsd:      19.99,
    supplierLimit: 25,
    scanFrequency: "Daily",
    tagline:       "For active risk teams.",
    features: [
      "Up to 25 suppliers",
      "Daily automated scans",
      "Email + Slack alerts",
      "Score trajectory + signals feed",
      "Manual on-demand scans",
    ],
  },
  enterprise: {
    id:            "enterprise",
    name:          "Enterprise",
    priceUsd:      99.99,
    supplierLimit: Number.POSITIVE_INFINITY,
    scanFrequency: "Every 6 hours",
    tagline:       "For scaling procurement orgs.",
    features: [
      "Unlimited suppliers",
      "6-hour scan cadence",
      "Email + Slack alerts",
      "Priority support",
      "Custom integrations",
    ],
  },
};

/**
 * Format a USD plan price for display (e.g. 19.99 → "19.99", 49 → "49").
 * Strips trailing ".00" for cleaner whole-dollar amounts.
 */
export function formatPrice(amount: number): string {
  const fixed = amount.toFixed(2);
  return fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed;
}

export const TIER_ORDER: Tier[] = ["starter", "pro", "enterprise"];

/** Coerce an unknown string into a known Tier, falling back to starter. */
export function normalizeTier(value: string | null | undefined): Tier {
  if (value === "pro" || value === "enterprise" || value === "starter") {
    return value;
  }
  return "starter";
}

/** Human-readable string for a supplier limit (handles Infinity). */
export function formatLimit(limit: number): string {
  return Number.isFinite(limit) ? String(limit) : "Unlimited";
}
