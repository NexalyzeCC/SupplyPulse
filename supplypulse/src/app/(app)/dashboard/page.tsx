import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-24 text-center">
      {/* Icon */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 ring-1 ring-blue-100">
        <ShieldCheck className="h-8 w-8 text-blue-600" />
      </div>

      <h2 className="text-xl font-bold text-slate-900">
        Your watchlist is empty
      </h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Add your first supplier and the AI agent will return a risk score in
        under 60 seconds.
      </p>

      <Link
        href="/suppliers/new"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add your first supplier
      </Link>
    </div>
  );
}
