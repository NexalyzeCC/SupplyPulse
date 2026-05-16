import {
  Newspaper,
  Scale,
  BarChart3,
  Users,
  Factory,
  type LucideIcon,
} from "lucide-react";
import { getSeverityColor, getSignalTypeLabel } from "@/lib/utils";
import type { Signal } from "@/lib/types/types";

// ─── Type icon map ────────────────────────────────────────────────────────────

const TYPE_ICON: Record<Signal["type"], LucideIcon> = {
  news: Newspaper,
  legal: Scale,
  financial: BarChart3,
  leadership: Users,
  operational: Factory,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface SignalBadgeProps {
  type: Signal["type"];
  severity: Signal["severity"];
  /** Show the signal type label alongside the severity. Defaults to true. */
  showType?: boolean;
  /** Show the icon. Defaults to true. */
  showIcon?: boolean;
  /** Extra classes applied to the outer element. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SignalBadge({
  type,
  severity,
  showType = true,
  showIcon = true,
  className = "",
}: SignalBadgeProps) {
  const Icon = TYPE_ICON[type];
  const sev = getSeverityColor(severity);

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
        "text-[10px] font-semibold capitalize",
        sev.badge,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={`${getSignalTypeLabel(type)} · ${severity} severity`}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0" aria-hidden />}
      {showType && (
        <span>{getSignalTypeLabel(type)}</span>
      )}
      <span className={showType ? "opacity-60" : ""}>{severity}</span>
    </span>
  );
}
