// Skeleton that matches the SupplierForm layout (labelled fields + submit button).

function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`}
      aria-hidden
    />
  );
}

function FieldSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Bone className="h-3.5 w-24" />
      <Bone className={`h-10 ${wide ? "w-full" : "w-full"} rounded-xl`} />
    </div>
  );
}

export default function NewSupplierLoading() {
  return (
    <div
      className="mx-auto max-w-2xl space-y-8 px-4 py-8 sm:px-6"
      aria-label="Loading form…"
      aria-busy
    >
      {/* Page header */}
      <div className="space-y-2">
        <Bone className="h-7 w-48" />
        <Bone className="h-3.5 w-72" />
      </div>

      {/* Form card */}
      <div className="space-y-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

        {/* Name */}
        <FieldSkeleton />

        {/* Country + Category (2-col) */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>

        {/* Criticality radio group */}
        <div className="flex flex-col gap-1.5">
          <Bone className="h-3.5 w-24" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Alert threshold */}
        <FieldSkeleton />

        {/* Slack webhook */}
        <FieldSkeleton />

        {/* Submit button */}
        <Bone className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
