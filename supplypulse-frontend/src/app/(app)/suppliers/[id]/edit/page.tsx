import { notFound } from "next/navigation";
import SupplierForm from "@/components/suppliers/SupplierForm";
import { createClient } from "@/lib/supabase/server";
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
    <SupplierForm
      supplier={supplier}
      cancelHref={`/suppliers/${supplier.id}`}
    />
  );
}
