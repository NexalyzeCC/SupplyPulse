import { getScoreColor, getScoreTier } from "@/lib/utils";

interface AlertBadgeProps {
  score: number;
  /** Visual size of the badge. Defaults to "md". */
  size?: "sm" | "md" | "lg";
  /** Show the tier label ("Healthy", "At Risk", "Critical") below the score. */
  showLabel?: boolean;
  /** Override the default aria-label. */
  ariaLabel?: string;
}

const SIZE = {
  sm: {
    circle: "h-10 w-10",
    score: "text-base",
    label: "text-[10px]",
    sub: "text-[8px]",
    pulse: "h-10 w-10",
  },
  md: {
    circle: "h-14 w-14",
    score: "text-2xl",
    label: "text-xs",
    sub: "text-[10px]",
    pulse: "h-14 w-14",
  },
  lg: {
    circle: "h-20 w-20",
    score: "text-4xl",
    label: "text-sm",
    sub: "text-xs",
    pulse: "h-20 w-20",
  },
} as const;

export default function AlertBadge({
  score,
  size = "md",
  showLabel = false,
  ariaLabel,
}: AlertBadgeProps) {
  const colors = getScoreColor(score);
  const tier = getScoreTier(score);
  const s = SIZE[size];
  const isCritical = score < 25;

  const label = ariaLabel ?? `Health score: ${score} out of 100 — ${tier}`;

  return (
    <div
      className="relative inline-flex flex-col items-center gap-1"
      role="img"
      aria-label={label}
    >
      {/* Pulsing ring — only rendered for critical scores (<25) */}
      {isCritical && (
        <span
          aria-hidden
          className={`
            absolute rounded-full ${colors.dot} opacity-30
            animate-ping ${s.pulse}
          `}
        />
      )}

      {/* Score circle */}
      <div
        className={`
          relative flex flex-col items-center justify-center rounded-full
          ring-4 font-bold tabular-nums
          ${s.circle} ${colors.bg} ${colors.text} ${colors.ring}
        `}
      >
        <span className={`leading-none ${s.score}`}>{score}</span>
        <span className={`font-medium opacity-60 leading-none mt-0.5 ${s.sub}`}>
          /100
        </span>
      </div>

      {/* Optional tier label beneath the circle */}
      {showLabel && (
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${s.label} ${colors.badge}`}
        >
          {tier}
        </span>
      )}
    </div>
  );
}
