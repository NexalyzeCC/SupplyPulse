"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function NewSupplierError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[New supplier error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 ring-1 ring-red-100 dark:bg-red-950 dark:ring-red-900">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
        Could not open the form
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
        Something went wrong while loading the add-supplier page. Please try
        again.
      </p>
      {error.message && (
        <p className="mt-2 rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {error.message}
        </p>
      )}
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  );
}
