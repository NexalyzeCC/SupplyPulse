import { ShieldCheck, AlertTriangle, XCircle, Activity } from "lucide-react";
import type { SupplierWithScore } from "@/lib/types/types";

interface Props {
  suppliers: SupplierWithScore[];
}

export default function DashboardStats({ suppliers }: Props) {
  const scored = suppliers.filter((s) => s.latestScore !== null);

  const healthy = scored.filter((s) => s.latestScore!.score >= 70).length;
  const atRisk = scored.filter(
    (s) => s.latestScore!.score >= 40 && s.latestScore!.score < 70,
  ).length;
  const critical = scored.filter((s) => s.latestScore!.score < 40).length;
  const unscored = suppliers.length - scored.length;

  const stats = [
    {
      label: "Total suppliers",
      value: suppliers.length,
      icon: Activity,
      iconClass: "text-blue-600",
      bgClass: "bg-blue-50",
      valueClass: "text-slate-900",
    },
    {
      label: "Healthy",
      value: healthy,
      icon: ShieldCheck,
      iconClass: "text-emerald-600",
      bgClass: "bg-emerald-50",
      valueClass: "text-emerald-700",
    },
    {
      label: "At risk",
      value: atRisk,
      icon: AlertTriangle,
      iconClass: "text-amber-600",
      bgClass: "bg-amber-50",
      valueClass: "text-amber-700",
    },
    {
      label: "Critical",
      value: critical,
      icon: XCircle,
      iconClass: "text-red-600",
      bgClass: "bg-red-50",
      valueClass: "text-red-700",
    },
  ] as const;

  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {stats.map(({ label, value, icon: Icon, iconClass, bgClass, valueClass }) => (
        <div
          key={label}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bgClass}`}
          >
            <Icon className={`h-5 w-5 ${iconClass}`} />
          </div>
          <div className="min-w-0">
            <dt className="truncate text-xs font-medium text-slate-500">
              {label}
            </dt>
            <dd className={`mt-0.5 text-2xl font-bold tabular-nums ${valueClass}`}>
              {value}
            </dd>
          </div>
        </div>
      ))}

      {/* Inline unscored callout — only shown when relevant */}
      {unscored > 0 && (
        <div className="col-span-full rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{unscored}</span>{" "}
          supplier{unscored !== 1 ? "s have" : " has"} not been scanned yet.
          Use <strong>Scan Now</strong> on any card to trigger the agent.
        </div>
      )}
    </dl>
  );
}
