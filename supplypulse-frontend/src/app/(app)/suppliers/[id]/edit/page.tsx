import { notFound } from "next/navigation";
<<<<<<< Updated upstream
import SupplierForm from "@/components/suppliers/SupplierForm";
import { createClient } from "@/lib/supabase/server";
=======
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SupplierForm from "@/components/suppliers/SupplierForm";
import DeleteSupplierButton from "@/components/suppliers/DeleteSupplierButton";
>>>>>>> Stashed changes
import type { Supplier } from "@/lib/types/types";

async function getSupplier(id: string): Promise<Supplier | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .single();

  return data as Supplier | null;
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
<<<<<<< Updated upstream
    <SupplierForm
      supplier={supplier}
      cancelHref={`/suppliers/${supplier.id}`}
    />
=======
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
      <SupplierForm
        supplier={supplier}
        cancelHref={`/suppliers/${id}`}
      />

      {/* ── Danger zone ── */}
      <section
        aria-labelledby="danger-zone-title"
        className="mt-8 rounded-2xl border border-red-200 bg-red-50/50 dark:border-red-500/30 dark:bg-red-950/20"
      >
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <h2
                id="danger-zone-title"
                className="text-sm font-semibold text-red-800 dark:text-red-200"
              >
                Danger zone
              </h2>
              <p className="mt-1 text-sm text-red-700/80 dark:text-red-200/80">
                Deleting a supplier permanently removes its score history,
                signals, and alerts. This cannot be undone.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <DeleteSupplierButton
              supplierId={supplier.id}
              supplierName={supplier.name}
            />
          </div>
        </div>
      </section>
    </div>
>>>>>>> Stashed changes
  );
}
