import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { SupplierScore, SupplierWithScore } from "@/lib/types/types";
import DashboardStats from "@/components/dashboard/DashboardStats";
import SupplierCard from "@/components/suppliers/SupplierCard";
import EmptyState from "@/components/common/EmptyState";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getWatchlist(): Promise<SupplierWithScore[]> {
  const supabase = await createClient();

  // Fetch all suppliers belonging to the current user (RLS enforces ownership)
  const { data: suppliers, error: suppliersError } = await supabase
    .from("suppliers")
    .select("*")
    .order("created_at", { ascending: false });

  if (suppliersError) throw new Error(suppliersError.message);
  if (!suppliers || suppliers.length === 0) return [];

  // Fetch all scores for these suppliers in one round-trip, newest first
  const supplierIds = suppliers.map((s) => s.id);
  const { data: scores, error: scoresError } = await supabase
    .from("supplier_scores")
    .select("*")
    .in("supplier_id", supplierIds)
    .order("created_at", { ascending: false });

  if (scoresError) throw new Error(scoresError.message);

  // Build a Map: supplier_id → latest SupplierScore
  // Because scores are ordered DESC, the first hit per supplier_id is latest
  const latestBySupplier = new Map<string, SupplierScore>();
  for (const score of scores ?? []) {
    if (!latestBySupplier.has(score.supplier_id)) {
      latestBySupplier.set(score.supplier_id, score as SupplierScore);
    }
  }

  // Join and sort: worst score first (ascending), unscored suppliers at end
  return suppliers
    .map((s) => ({
      ...s,
      latestScore: latestBySupplier.get(s.id) ?? null,
    }))
    .sort((a, b) => {
      const scoreA = a.latestScore?.score ?? 999;
      const scoreB = b.latestScore?.score ?? 999;
      return scoreA - scoreB;
    });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const suppliers = await getWatchlist();

  if (suppliers.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        iconColor="text-blue-600"
        iconBg="bg-blue-50 ring-1 ring-blue-100"
        title="Your watchlist is empty"
        description="Add your first supplier and the AI agent will return a 0–100 risk score with signals and recommendations in under 60 seconds."
        action={{ label: "Add your first supplier", href: "/suppliers/new", icon: Plus }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats across the watchlist */}
      <DashboardStats suppliers={suppliers} />

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Supplier watchlist
          </h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {suppliers.length} supplier{suppliers.length !== 1 ? "s" : ""} ·
            sorted by risk (worst first)
          </p>
        </div>
        <Link
          href="/suppliers/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Supplier
        </Link>
      </div>

      {/* Cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {suppliers.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} />
        ))}
      </div>
    </div>
  );
}
