function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`}
      aria-hidden
    />
  );
}

export default function NewSupplierLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" aria-label="Loading form…" aria-busy>
      <Bone className="h-4 w-32" />
      <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Bone className="mb-6 h-7 w-48" />
        <div className="space-y-5">
          <Bone className="h-10 w-full" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Bone className="h-10 w-full" />
            <Bone className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Bone className="h-2 w-full rounded-full" />
          <Bone className="h-10 w-full" />
        </div>
        <div className="mt-8 flex justify-between border-t border-slate-100 pt-5 dark:border-slate-700">
          <Bone className="h-9 w-16" />
          <Bone className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
