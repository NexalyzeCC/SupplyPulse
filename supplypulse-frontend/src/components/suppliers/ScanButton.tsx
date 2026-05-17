"use client";

import { useEffect, useRef } from "react";
import {
  Zap,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useScanPolling, MAX_POLLS } from "@/hooks/useScanPolling";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScanButtonProps {
  supplierId: string;
  /** "sm" collapses the label and progress bar — used on supplier cards. */
  size?: "sm" | "md";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScanButton({
  supplierId,
  size = "md",
}: ScanButtonProps) {
  const { state, trigger, reset } = useScanPolling(supplierId);
  const sm = size === "sm";

  // Fire toasts on state transitions (skip the initial "idle" mount)
  const prevKind = useRef(state.kind);
  useEffect(() => {
    const prev = prevKind.current;
    const next = state.kind;
    if (prev === next) return;
    prevKind.current = next;

    if (next === "scanning" && prev === "starting") {
      toast.info("Scan started", {
        description: "The AI agent is scanning for risk signals…",
      });
    } else if (next === "complete") {
      toast.success("Scan complete", {
        description: "Risk score updated. Refreshing page data…",
      });
    } else if (next === "timeout") {
      toast.warning("Scan timed out", {
        description: "The scan is taking longer than expected. Try again shortly.",
      });
    } else if (next === "error") {
      toast.error("Scan failed", {
        description: (state as { kind: "error"; message: string }).message,
      });
    }
  }, [state]);

  // Shared base classes for every button/badge variant
  const base = sm
    ? "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
    : "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-colors";

  // ── idle / starting ──────────────────────────────────────────────────────

  if (state.kind === "idle" || state.kind === "starting") {
    const isStarting = state.kind === "starting";
    return (
      <button
        onClick={trigger}
        disabled={isStarting}
        className={`${base} border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-400`}
      >
        {isStarting ? (
          <Loader2 className={`${sm ? "h-3 w-3" : "h-4 w-4"} animate-spin`} />
        ) : (
          <Zap className={`${sm ? "h-3 w-3" : "h-4 w-4"}`} />
        )}
        {isStarting ? "Starting…" : "Scan Now"}
      </button>
    );
  }

  // ── scanning ─────────────────────────────────────────────────────────────

  if (state.kind === "scanning") {
    const elapsedSec = Math.floor(state.elapsedMs / 1_000);
    const progressPct = Math.min(100, (state.polls / MAX_POLLS) * 100);

    return (
      <div className="flex flex-col items-end gap-1.5">
        <div
          className={`${base} cursor-default border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/55 dark:bg-blue-950/40 dark:text-blue-300`}
        >
          <Loader2 className={`${sm ? "h-3 w-3" : "h-4 w-4"} animate-spin`} />
          {sm ? "Scanning…" : `Scanning… (${elapsedSec}s)`}
        </div>
        {!sm && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950/70">
            <div
              className="h-full rounded-full bg-blue-400 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // ── complete ─────────────────────────────────────────────────────────────

  if (state.kind === "complete") {
    return (
      <div
        className={`${base} cursor-default border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/55 dark:bg-emerald-950/35 dark:text-emerald-300`}
      >
        <CheckCircle2 className={`${sm ? "h-3 w-3" : "h-4 w-4"}`} />
        Done! Refreshing…
      </div>
    );
  }

  // ── timeout ──────────────────────────────────────────────────────────────

  if (state.kind === "timeout") {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`${base} cursor-default border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/55 dark:bg-amber-950/35 dark:text-amber-300`}
        >
          <Clock className={`${sm ? "h-3 w-3" : "h-4 w-4"}`} />
          Timed out
        </div>
        <button
          onClick={reset}
          title="Retry scan"
          className={`${base} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`}
        >
          <RotateCcw className={`${sm ? "h-3 w-3" : "h-4 w-4"}`} />
          {!sm && "Retry"}
        </button>
      </div>
    );
  }

  // ── error ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <div
          className={`${base} cursor-default border border-red-200 bg-red-50 text-red-700 dark:border-red-900/55 dark:bg-red-950/35 dark:text-red-300`}
        >
          <AlertTriangle className={`${sm ? "h-3 w-3" : "h-4 w-4"}`} />
          {sm ? "Failed" : "Scan failed"}
        </div>
        <button
          onClick={reset}
          title="Retry scan"
          className={`${base} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`}
        >
          <RotateCcw className={`${sm ? "h-3 w-3" : "h-4 w-4"}`} />
          {!sm && "Retry"}
        </button>
      </div>
      {!sm && (
        <p className="max-w-[260px] text-right text-[10px] text-red-500 dark:text-red-400">
          {state.message}
        </p>
      )}
    </div>
  );
}
