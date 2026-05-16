// Skeleton that matches the real dashboard layout (DashboardStats + card grid).
// Rendered instantly by Next.js while the server component fetches data.

function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 ${className}`}
      aria-hidden
    />
  );
}

// ─── Stats bar skeleton ───────────────────────────────────────────────────────

function StatsBarSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
        >
          <Bone className="h-3 w-20" />
          <Bone className="h-7 w-10" />
        </div>
      ))}
    </div>
  );
}

// ─── Supplier card skeleton ───────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      {/* Header: score circle + name */}
      <div className="flex items-start gap-4">
        <Bone className="h-14 w-14 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-3/4" />
          <Bone className="h-3 w-1/2" />
          <div className="flex gap-2 pt-0.5">
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="h-5 w-14 rounded-full" />
          </div>
        </div>
      </div>
      {/* Summary lines */}
      <div className="space-y-1.5">
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-5/6" />
        <Bone className="h-3 w-2/3" />
      </div>
      {/* Footer row */}
      <div className="flex items-center justify-between pt-1">
        <Bone className="h-3 w-28" />
        <Bone className="h-8 w-20 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Page skeleton ────────────────────────────────────────────────────────────

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard…" aria-busy>

      {/* Stats bar */}
      <StatsBarSkeleton />

      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Bone className="h-4 w-36" />
          <Bone className="h-3 w-48" />
        </div>
        <Bone className="h-9 w-32 rounded-lg" />
      </div>

      {/* Card grid — 3 placeholders */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

    </div>
  );
}
