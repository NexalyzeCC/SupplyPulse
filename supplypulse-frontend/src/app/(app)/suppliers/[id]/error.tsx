"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SupplierDetailError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[Supplier detail error]", error);
  }, [error]);

  return (
    <div className="space-y-6">
      {/* Back link — still navigable even when the page errors */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-red-100 bg-red-50 py-24 text-center shadow-sm">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white ring-1 ring-red-200">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Supplier details failed to load
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
          We couldn&apos;t retrieve this supplier&apos;s data. The page will work
          normally once the issue resolves — try refreshing.
        </p>
        {error.message && (
          <p className="mt-2 rounded-lg bg-white px-3 py-1.5 font-mono text-xs text-slate-400 ring-1 ring-slate-200">
            {error.message}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
