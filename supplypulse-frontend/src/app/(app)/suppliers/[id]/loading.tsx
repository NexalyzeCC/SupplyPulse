// Skeleton matching the supplier detail page layout:
//   hero card → 2-col grid (trajectory + AI summary | signal feed + recommendations)

function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 ${className}`}
      aria-hidden
    />
  );
}

// ─── Hero card skeleton ───────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Colour band */}
      <Bone className="h-1.5 w-full rounded-none" />
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: badge + name + meta */}
        <div className="flex items-start gap-5">
          {/* Score circle */}
          <Bone className="h-20 w-20 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <Bone className="h-7 w-48" />
              <Bone className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex gap-3">
              <Bone className="h-3.5 w-24" />
              <Bone className="h-3.5 w-20" />
              <Bone className="h-5 w-14 rounded-full" />
            </div>
            <Bone className="h-3.5 w-36" />
            <Bone className="h-3 w-44" />
          </div>
        </div>
        {/* Right: action buttons */}
        <div className="flex shrink-0 gap-2">
          <Bone className="h-9 w-28 rounded-xl" />
          <Bone className="h-9 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Chart skeleton ───────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="space-y-1.5">
          <Bone className="h-4 w-32" />
          <Bone className="h-3 w-20" />
        </div>
        <Bone className="h-9 w-12" />
      </div>
      {/* Time-window tabs */}
      <div className="mb-4 flex gap-2">
        <Bone className="h-7 w-12 rounded-md" />
        <Bone className="h-7 w-12 rounded-md" />
        <Bone className="h-7 w-12 rounded-md" />
      </div>
      {/* Chart area */}
      <Bone className="h-52 w-full rounded-xl" />
    </div>
  );
}

// ─── AI summary skeleton ──────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Bone className="mb-4 h-4 w-28" />
      <div className="space-y-2">
        <Bone className="h-3.5 w-full" />
        <Bone className="h-3.5 w-full" />
        <Bone className="h-3.5 w-5/6" />
        <Bone className="h-3.5 w-4/6" />
      </div>
      <Bone className="mt-4 h-3 w-52" />
    </div>
  );
}

// ─── Signal feed skeleton ─────────────────────────────────────────────────────

function SignalFeedSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header + filter pills */}
      <div className="mb-4 flex items-center justify-between">
        <Bone className="h-4 w-32" />
        <Bone className="h-3 w-20" />
      </div>
      <div className="mb-4 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>
      {/* Signal cards */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2"
          >
            <div className="flex items-start gap-3">
              <Bone className="h-8 w-8 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Bone className="h-3.5 w-full" />
                <Bone className="h-3.5 w-5/6" />
              </div>
              <Bone className="h-5 w-16 shrink-0 rounded-full" />
            </div>
            {/* Confidence bar */}
            <div className="flex items-center gap-3">
              <Bone className="h-2 w-full rounded-full" />
              <Bone className="h-3 w-8 shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recommendations skeleton ─────────────────────────────────────────────────

function RecommendationsSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header + progress */}
      <div className="mb-4 flex items-start justify-between">
        <div className="space-y-1.5">
          <Bone className="h-4 w-40" />
          <Bone className="h-3 w-28" />
        </div>
        <Bone className="h-8 w-16 rounded-full" />
      </div>
      <Bone className="mb-5 h-2 w-full rounded-full" />
      {/* Action items */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Bone className="mt-0.5 h-5 w-5 shrink-0 rounded" />
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-full" />
              <Bone className="h-3.5 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page skeleton ────────────────────────────────────────────────────────────

export default function SupplierDetailLoading() {
  return (
    <div className="space-y-6" aria-label="Loading supplier details…" aria-busy>

      {/* Back link stub */}
      <Bone className="h-4 w-32" />

      {/* Hero */}
      <HeroSkeleton />

      {/* 2-column grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-7">
          <ChartSkeleton />
          <SummarySkeleton />
        </div>
        {/* Right column */}
        <div className="space-y-6 lg:col-span-5">
          <SignalFeedSkeleton />
          <RecommendationsSkeleton />
        </div>
      </div>

    </div>
  );
}
