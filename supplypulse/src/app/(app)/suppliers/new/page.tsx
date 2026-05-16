import { Construction } from "lucide-react";

export default function NewSupplierPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-24 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
        <Construction className="h-8 w-8 text-amber-500" />
      </div>

      <h2 className="text-xl font-bold text-slate-900">Coming in Phase 3</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The Add Supplier form is built in the next phase. The data model,
        validation, and agent trigger will live here.
      </p>
    </div>
  );
}
