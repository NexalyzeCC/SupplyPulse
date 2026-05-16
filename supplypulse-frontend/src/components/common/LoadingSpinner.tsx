type Size = "xs" | "sm" | "md" | "lg";

interface LoadingSpinnerProps {
  size?: Size;
  className?: string;
  label?: string;
}

const SIZE_MAP: Record<Size, string> = {
  xs: "h-3 w-3 border-[1.5px]",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
};

/**
 * Accessible inline loading spinner.
 * Wrap with a parent `flex items-center gap-2` to pair with text.
 */
export default function LoadingSpinner({
  size = "md",
  className = "",
  label = "Loading…",
}: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block shrink-0 animate-spin rounded-full border-slate-300 border-t-blue-600 ${SIZE_MAP[size]} ${className}`}
    />
  );
}
