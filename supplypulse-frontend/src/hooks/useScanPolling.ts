"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiUrl } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

export const POLL_INTERVAL_MS = 5_000;            // 5 s between polls
export const POLL_TIMEOUT_MS  = 3 * 60 * 1_000;  // 3-minute hard stop
export const MAX_POLLS        = POLL_TIMEOUT_MS / POLL_INTERVAL_MS; // 36

// ─── API response type ────────────────────────────────────────────────────────

export type StatusResponse =
  | { status: "running" }
  | {
      status: "complete";
      score: number;
      direction: "improving" | "stable" | "deteriorating";
      scoreId: string;
    }
  | { status: "failed"; message?: string };

// ─── Completed score snapshot ─────────────────────────────────────────────────

export interface LatestScore {
  score:     number;
  direction: "improving" | "stable" | "deteriorating";
  scoreId:   string;
}

// ─── Discriminated state ──────────────────────────────────────────────────────

export type ScanState =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "scanning"; polls: number; elapsedMs: number }
  | { kind: "complete"; latestScore: LatestScore }
  | { kind: "error";   message: string }
  | { kind: "timeout" };

// ─── Return type ──────────────────────────────────────────────────────────────

export interface UseScanPollingReturn {
  state:       ScanState;
  latestScore: LatestScore | null;
  trigger:     () => Promise<void>;
  reset:       () => void;
}

// ─── Module-level poll loop (no hook, no self-reference issue) ────────────────
//
// Keeping this outside the hook means it can recurse freely without any
// "accessed before declared" constraint from useCallback's closure.

async function runPollLoop(
  abort:      AbortController,
  pollCount:  number,
  supplierId: string,
  getToken:   () => Promise<string | null>,
  setState:   React.Dispatch<React.SetStateAction<ScanState>>,
  onComplete: () => void,
): Promise<void> {
  if (abort.signal.aborted) return;

  if (pollCount >= MAX_POLLS) {
    setState({ kind: "timeout" });
    return;
  }

  // Wait before each query; first poll fires 5 s after trigger
  await sleep(POLL_INTERVAL_MS, abort.signal);
  if (abort.signal.aborted) return;

  try {
    const token = await getToken();
    const headers: HeadersInit = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    const res = await fetch(
      apiUrl("score-status", { id: supplierId }),
      { headers, signal: abort.signal },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      setState({
        kind:    "error",
        message: text || `Status check failed (HTTP ${res.status}).`,
      });
      return;
    }

    const data = (await res.json()) as StatusResponse;

    switch (data.status) {
      case "complete": {
        const latestScore: LatestScore = {
          score:     data.score,
          direction: data.direction,
          scoreId:   data.scoreId,
        };
        setState({ kind: "complete", latestScore });
        onComplete(); // router.refresh()
        return;
      }

      case "failed":
        setState({
          kind:    "error",
          message: data.message ?? "The agent scan failed. Please try again.",
        });
        return;

      case "running":
      default:
        // Increment poll counter and recurse
        setState((prev) =>
          prev.kind === "scanning"
            ? { ...prev, polls: pollCount + 1 }
            : prev,
        );
        await runPollLoop(abort, pollCount + 1, supplierId, getToken, setState, onComplete);
    }
  } catch (err) {
    if (!abort.signal.aborted) {
      setState({
        kind:    "error",
        message:
          err instanceof Error
            ? err.message
            : "Network error. Check your connection and retry.",
      });
    }
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export function useScanPolling(supplierId: string): UseScanPollingReturn {
  const router   = useRouter();
  const [state, setState] = useState<ScanState>({ kind: "idle" });

  const abortRef  = useRef<AbortController | null>(null);
  const startRef  = useRef<number>(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, []);

  // ── Elapsed-second ticker ─────────────────────────────────────────────────

  useEffect(() => {
    if (state.kind !== "scanning") {
      if (tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
      return;
    }

    tickerRef.current = setInterval(() => {
      setState((prev) =>
        prev.kind === "scanning"
          ? { ...prev, elapsedMs: Date.now() - startRef.current }
          : prev,
      );
    }, 1_000);

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [state.kind]);

  // ── Auto-reset from complete after 3 s ────────────────────────────────────

  useEffect(() => {
    if (state.kind !== "complete") return;
    const t = setTimeout(() => setState({ kind: "idle" }), 3_000);
    return () => clearTimeout(t);
  }, [state.kind]);

  // ── Trigger ───────────────────────────────────────────────────────────────

  const trigger = useCallback(async () => {
    if (state.kind !== "idle") return;

    setState({ kind: "starting" });

    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const token = await getAccessToken();
      if (!token) {
        setState({
          kind:    "error",
          message: "Your session expired. Please sign in again.",
        });
        return;
      }

      const res = await fetch(apiUrl("score-supplier"), {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body:    JSON.stringify({ supplierId }),
        signal:  abort.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setState({
          kind:    "error",
          message: text || `Failed to start scan (HTTP ${res.status}).`,
        });
        return;
      }

      startRef.current = Date.now();
      setState({ kind: "scanning", polls: 0, elapsedMs: 0 });

      await runPollLoop(abort, 0, supplierId, getAccessToken, setState, () => router.refresh());
    } catch (err) {
      if (!abort.signal.aborted) {
        setState({
          kind:    "error",
          message: err instanceof Error ? err.message : "Failed to start scan.",
        });
      }
    }
  }, [state.kind, supplierId, router]);

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    abortRef.current?.abort();
    if (tickerRef.current) clearInterval(tickerRef.current);
    setState({ kind: "idle" });
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const latestScore =
    state.kind === "complete" ? state.latestScore : null;

  return { state, latestScore, trigger, reset };
}

// ─── Abortable sleep ──────────────────────────────────────────────────────────

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
