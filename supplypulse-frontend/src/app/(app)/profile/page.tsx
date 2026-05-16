import { redirect } from "next/navigation";
import { UserCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { normalizeTier } from "@/lib/plans";
import AccountSection from "@/components/profile/AccountSection";
import PlanSection from "@/components/profile/PlanSection";
import DangerZone from "@/components/profile/DangerZone";
import BillingReturnToast from "@/components/profile/BillingReturnToast";

// ─── Page metadata ───────────────────────────────────────────────────────────

export const metadata = {
  title: "Profile — SupplyPulse",
};

// ─── Data fetching ───────────────────────────────────────────────────────────

async function loadProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Subscription row (may not exist for brand-new users — defaults to starter)
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select(
      "tier, status, current_period_end, stripe_customer_id, stripe_subscription_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // Current supplier count for usage display
  const { count: supplierCount } = await supabase
    .from("suppliers")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return {
    user: {
      id:         user.id,
      email:      user.email ?? "",
      created_at: user.created_at,
    },
    subscription: {
      tier:                   normalizeTier(sub?.tier ?? null),
      status:                 sub?.status ?? null,
      current_period_end:     sub?.current_period_end ?? null,
      has_stripe_customer:    !!sub?.stripe_customer_id,
      has_active_subscription: !!sub?.stripe_subscription_id,
    },
    supplierCount: supplierCount ?? 0,
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; canceled?: string }>;
}) {
  const { user, subscription, supplierCount } = await loadProfile();
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Surfaces a toast after returning from Stripe Checkout */}
      <BillingReturnToast
        upgraded={params.upgraded === "1"}
        canceled={params.canceled === "1"}
      />

      {/* ── Page header ── */}
      <header className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
          <UserCircle className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Your profile
          </h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Manage your account, security, and subscription.
          </p>
        </div>
      </header>

      {/* ── Account & security ── */}
      <AccountSection
        email={user.email}
        memberSince={user.created_at}
      />

      {/* ── Subscription ── */}
      <PlanSection
        tier={subscription.tier}
        status={subscription.status}
        currentPeriodEnd={subscription.current_period_end}
        hasStripeCustomer={subscription.has_stripe_customer}
        hasActiveSubscription={subscription.has_active_subscription}
        supplierCount={supplierCount}
      />

      {/* ── Danger zone ── */}
      <DangerZone />
    </div>
  );
}
