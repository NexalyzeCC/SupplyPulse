"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Sparkles,
  CheckCircle2,
  Loader2,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  PLANS,
  TIER_ORDER,
  formatLimit,
  formatPrice,
  type Tier,
} from "@/lib/plans";

interface Props {
  tier:                  Tier;
  status:                string | null;
  currentPeriodEnd:      string | null;
  hasStripeCustomer:     boolean;
  hasActiveSubscription: boolean;
  supplierCount:         number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Stripe / portal return absolute HTTPS URLs; module-level avoids render-phase purity lint false-positives. */
function redirectToExternalUrl(url: string) {
  if (typeof window === "undefined") return;
  window.location.assign(url);
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year:  "numeric",
      month: "short",
      day:   "numeric",
    });
  } catch {
    return null;
  }
}

const STATUS_STYLES: Record<string, string> = {
  active:
    "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  trialing:
    "bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30",
  past_due:
    "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  canceled:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-600",
  incomplete:
    "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  incomplete_expired:
    "bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30",
  unpaid:
    "bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30",
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-700/40 dark:text-slate-300 dark:ring-slate-600">
        Free
      </span>
    );
  }
  const cls = STATUS_STYLES[status] ?? STATUS_STYLES.canceled;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${cls}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PlanSection({
  tier,
  status,
  currentPeriodEnd,
  hasStripeCustomer,
  hasActiveSubscription,
  supplierCount,
}: Props) {
  const [pending, setPending] = useState<Tier | "portal" | null>(null);

  const current = PLANS[tier];
  const periodEnd = formatDate(currentPeriodEnd);

  const usagePct = Number.isFinite(current.supplierLimit)
    ? Math.min(100, Math.round((supplierCount / current.supplierLimit) * 100))
    : 0;

  // ── Upgrade handler ──
  async function startCheckout(plan: Exclude<Tier, "starter">) {
    setPending(plan);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token ?? null;
      if (!token) {
        toast.error("Not signed in", {
          description: "Please sign in again to upgrade.",
        });
        setPending(null);
        return;
      }

      const res = await fetch(`${API_BASE}/.netlify/functions/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        url?:   string;
        error?: string;
      };

      if (!res.ok || !data.url) {
        const msg = data.error ?? `Failed to start checkout (HTTP ${res.status}).`;
        toast.error("Upgrade unavailable", { description: msg });
        setPending(null);
        return;
      }

      redirectToExternalUrl(data.url);
    } catch (err) {
      toast.error("Upgrade unavailable", {
        description:
          err instanceof Error ? err.message : "Network error. Please try again.",
      });
      setPending(null);
    }
  }

  // ── Billing portal ──
  async function openBillingPortal() {
    setPending("portal");
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token ?? null;
      if (!token) {
        toast.error("Not signed in", {
          description: "Please sign in again.",
        });
        setPending(null);
        return;
      }

      const res = await fetch(`${API_BASE}/.netlify/functions/billing-portal`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = (await res.json().catch(() => ({}))) as {
        url?:   string;
        error?: string;
      };

      if (!res.ok || !data.url) {
        const msg = data.error ?? `Failed to open portal (HTTP ${res.status}).`;
        toast.error("Billing portal unavailable", { description: msg });
        setPending(null);
        return;
      }

      redirectToExternalUrl(data.url);
    } catch (err) {
      toast.error("Billing portal unavailable", {
        description:
          err instanceof Error ? err.message : "Network error. Please try again.",
      });
      setPending(null);
    }
  }

  return (
    <section className="space-y-5">
      {/* ── Current plan card ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
            <CreditCard className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Subscription
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Manage your plan, billing, and invoices.
            </p>
          </div>
          {hasActiveSubscription && (
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={pending !== null}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {pending === "portal" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Manage billing
            </button>
          )}
        </div>

        <div className="px-6 py-5">
          {/* Plan name + status */}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {current.name}
            </span>
            <StatusBadge status={status} />
            {current.priceUsd === 0 ? (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Free
              </span>
            ) : (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                ${formatPrice(current.priceUsd)}
                <span className="text-xs">/mo</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {current.tagline}
          </p>

          {periodEnd && hasActiveSubscription && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {status === "canceled"
                ? `Access ends ${periodEnd}.`
                : `Renews ${periodEnd}.`}
            </p>
          )}

          {/* Usage meter */}
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200">
              <span>Suppliers in use</span>
              <span className="tabular-nums font-semibold text-blue-700 dark:text-blue-300">
                {supplierCount} / {formatLimit(current.supplierLimit)}
              </span>
            </div>
            {Number.isFinite(current.supplierLimit) && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePct >= 100
                      ? "bg-red-500"
                      : usagePct >= 80
                      ? "bg-amber-500"
                      : "bg-blue-600"
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Upgrade options ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {tier === "enterprise" ? "Your plan" : "Upgrade your plan"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {tier === "enterprise"
                ? "You're already on the top tier — thanks!"
                : "Higher tiers unlock more suppliers and faster scans."}
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-3">
          {TIER_ORDER.map((id) => {
            const plan = PLANS[id];
            const isCurrent = id === tier;
            const isUpgrade =
              TIER_ORDER.indexOf(id) > TIER_ORDER.indexOf(tier);
            const isDowngrade =
              TIER_ORDER.indexOf(id) < TIER_ORDER.indexOf(tier);

            return (
              <div
                key={id}
                className={[
                  "flex flex-col rounded-xl border p-5 transition-colors",
                  isCurrent
                    ? "border-blue-300 bg-blue-50/50 ring-1 ring-blue-200 dark:border-blue-500/40 dark:bg-blue-500/10 dark:ring-blue-500/30"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700",
                ].join(" ")}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {plan.name}
                  </h3>
                  {isCurrent && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {plan.tagline}
                </p>

                <div className="mt-3 flex items-baseline gap-1">
                  {plan.priceUsd === 0 ? (
                    <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                      Free
                    </span>
                  ) : (
                    <>
                      <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                        ${formatPrice(plan.priceUsd)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        /mo
                      </span>
                    </>
                  )}
                </div>

                <ul className="mt-4 space-y-2">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 pt-2">
                  {isCurrent ? (
                    <button
                      type="button"
                      disabled
                      className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500"
                    >
                      Current plan
                    </button>
                  ) : isUpgrade ? (
                    <button
                      type="button"
                      onClick={() =>
                        startCheckout(id as Exclude<Tier, "starter">)
                      }
                      disabled={pending !== null}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {pending === id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Starting checkout…
                        </>
                      ) : (
                        <>
                          Upgrade to {plan.name}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  ) : isDowngrade ? (
                    <button
                      type="button"
                      onClick={openBillingPortal}
                      disabled={!hasStripeCustomer || pending !== null}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Switch via billing portal
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
