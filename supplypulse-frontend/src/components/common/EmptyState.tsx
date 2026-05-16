import Link from "next/link";
import { ArrowRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Pass `href` for a Link, or `onClick` for a button — but not both. */
type EmptyStateAction =
  | { label: string; icon?: React.ElementType; href: string; onClick?: never }
  | { label: string; icon?: React.ElementType; onClick: () => void; href?: never };

/**
 * size="md" (default) — full-page empty state (dashboard, alerts). py-28 with
 *   a decorative outer ring and large icon container.
 * size="sm" — compact panel empty state (SignalFeed, RecommendationPanel).
 *   py-10 with a smaller icon and no decorative ring.
 */
interface EmptyStateProps {
  /** Lucide (or any) icon component rendered inside the illustration bubble. */
  icon: React.ElementType;
  title: string;
  description: string;
  /** Optional CTA — pass href for a Link, onClick for a button. */
  action?: EmptyStateAction;
  size?: "sm" | "md";
  /** Tailwind colour class for the icon (e.g. "text-blue-600"). Defaults to slate-400. */
  iconColor?: string;
  /** Tailwind bg + ring classes for the icon bubble. Defaults to slate-50 + ring-slate-200. */
  iconBg?: string;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  iconColor = "text-slate-400",
  iconBg = "bg-slate-50 ring-1 ring-slate-200",
  className = "",
}: EmptyStateProps) {
  const isCompact = size === "sm";

  return (
    <div
      className={[
        "flex flex-col items-center justify-center text-center",
        isCompact ? "py-10 px-4" : "py-28 px-6",
        className,
      ].join(" ")}
    >
      {/* ── Illustration bubble ── */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Decorative outer dashed ring — full size only */}
        {!isCompact && (
          <div
            aria-hidden
            className="absolute h-28 w-28 rounded-full border-2 border-dashed border-slate-200/80 dark:border-slate-700/60"
          />
        )}

        {/* Icon container */}
        <div
          className={[
            "flex items-center justify-center rounded-2xl",
            iconBg,
            isCompact ? "h-12 w-12" : "h-16 w-16",
          ].join(" ")}
        >
          <Icon
            className={[
              iconColor,
              isCompact ? "h-6 w-6" : "h-8 w-8",
            ].join(" ")}
          />
        </div>
      </div>

      {/* ── Copy ── */}
      <h3
        className={[
          "font-bold text-slate-900 dark:text-slate-100",
          isCompact ? "text-base" : "text-xl",
        ].join(" ")}
      >
        {title}
      </h3>
      <p
        className={[
          "mt-2 leading-6 text-slate-500 dark:text-slate-400",
          isCompact ? "max-w-xs text-xs" : "max-w-sm text-sm",
        ].join(" ")}
      >
        {description}
      </p>

      {/* ── CTA ── */}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link
              href={action.href}
              className={[
                "inline-flex items-center gap-2 rounded-xl font-semibold",
                "bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700",
                isCompact
                  ? "px-4 py-2 text-xs"
                  : "px-5 py-2.5 text-sm",
              ].join(" ")}
            >
              {action.icon
                ? <action.icon className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                : <ArrowRight className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              }
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className={[
                "inline-flex items-center gap-2 rounded-xl font-semibold",
                "bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700",
                isCompact
                  ? "px-4 py-2 text-xs"
                  : "px-5 py-2.5 text-sm",
              ].join(" ")}
            >
              {action.icon
                ? <action.icon className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                : <ArrowRight className={isCompact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              }
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
