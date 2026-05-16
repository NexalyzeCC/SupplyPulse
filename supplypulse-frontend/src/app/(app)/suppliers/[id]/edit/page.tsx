import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SupplierForm from "@/components/suppliers/SupplierForm";
import type { Supplier } from "@/lib/types/types";

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getSupplier(id: string): Promise<Supplier | null> {
  const supabase = await createClient();

  // RLS guarantees this returns null for rows owned by other users
  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  return data ?? null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  return {
    title: supplier ? `Edit ${supplier.name} — SupplyPulse` : "Edit Supplier",
  };
}

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await getSupplier(id);

  if (!supplier) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Back link */}
      <Link
        href={`/suppliers/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {supplier.name}
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Edit supplier
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Update details and alert settings for{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {supplier.name}
          </span>
          .
        </p>
      </div>

      {/* Form — supplier prop activates edit mode */}
      <SupplierForm supplier={supplier} />
    </div>
  );
}
