// Skeleton that matches the real alerts layout (header + timeline rows).

function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`}
      aria-hidden
    />
  );
}

function TimelineRowSkeleton() {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* Left: icon circle */}
      <Bone className="mt-0.5 h-9 w-9 shrink-0 rounded-full" />

      {/* Right: content */}
      <div className="flex-1 space-y-2">
        {/* Top row: supplier name + timestamp */}
        <div className="flex items-center justify-between gap-4">
          <Bone className="h-4 w-40" />
          <Bone className="h-3 w-20 shrink-0" />
        </div>
        {/* Score badge row */}
        <div className="flex items-center gap-2">
          <Bone className="h-5 w-14 rounded-full" />
          <Bone className="h-5 w-20 rounded-full" />
        </div>
        {/* Channel tags */}
        <div className="flex gap-2 pt-1">
          <Bone className="h-4 w-12 rounded-full" />
          <Bone className="h-4 w-10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function AlertsLoading() {
  return (
    <div className="space-y-6" aria-label="Loading alerts…" aria-busy>

      {/* Page header */}
      <div className="space-y-1.5">
        <Bone className="h-6 w-32" />
        <Bone className="h-3 w-64" />
      </div>

      {/* Timeline rows — 5 placeholders */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <TimelineRowSkeleton key={i} />
        ))}
      </div>

    </div>
  );
}
