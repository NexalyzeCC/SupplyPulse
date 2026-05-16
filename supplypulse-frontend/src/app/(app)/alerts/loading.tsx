function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`}
      aria-hidden
    />
  );
}

function AlertRowSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <Bone className="h-12 w-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Bone className="h-4 w-48" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-2/3" />
        <div className="flex gap-2 pt-1">
          <Bone className="h-5 w-16 rounded-full" />
          <Bone className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <Bone className="hidden h-8 w-24 shrink-0 rounded-lg sm:block" />
    </div>
  );
}

export default function AlertsLoading() {
  return (
    <div className="space-y-6" aria-label="Loading alerts…" aria-busy>
      <div className="space-y-2">
        <Bone className="h-7 w-40" />
        <Bone className="h-4 w-64" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <AlertRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
