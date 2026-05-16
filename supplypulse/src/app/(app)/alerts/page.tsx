import { BellOff } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-24 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
        <BellOff className="h-8 w-8 text-slate-400" />
      </div>

      <h2 className="text-xl font-bold text-slate-900">No alerts yet</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Alerts fire when a supplier score drops below your configured threshold
        and falls more than 10 points. They&apos;ll appear here once the agent
        runs.
      </p>
    </div>
  );
}
