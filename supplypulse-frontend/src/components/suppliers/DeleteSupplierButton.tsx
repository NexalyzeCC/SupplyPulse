"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  supplierId: string;
  supplierName: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function DeleteSupplierButton({
  supplierId,
  supplierName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // ── Action ──
  async function handleDelete() {
    if (confirmText.trim().toLowerCase() !== supplierName.trim().toLowerCase()) {
      toast.error("Name doesn't match", {
        description: "Type the supplier name exactly to confirm.",
      });
      return;
    }

    setDeleting(true);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? null;

    if (!token) {
      toast.error("Not signed in", {
        description: "Your session expired. Please sign in again.",
      });
      setDeleting(false);
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/.netlify/functions/suppliers?supplierId=${encodeURIComponent(supplierId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("Failed to delete supplier", {
          description: data.error ?? `HTTP ${res.status}`,
        });
        setDeleting(false);
        return;
      }

      toast.success("Supplier deleted", {
        description: `${supplierName} has been removed from your watchlist.`,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error("Failed to delete supplier", {
        description:
          err instanceof Error ? err.message : "Network error. Please try again.",
      });
      setDeleting(false);
    }
  }

  // ── Render ──
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
      >
        <Trash2 className="h-4 w-4" />
        Delete supplier
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-labelledby="delete-supplier-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 dark:bg-black/70"
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) setOpen(false);
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-800">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/15">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2
                id="delete-supplier-title"
                className="text-base font-semibold text-slate-900 dark:text-slate-100"
              >
                Delete this supplier?
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                This permanently removes{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {supplierName}
                </span>
                , its score history, signals, and alerts. This cannot be undone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={deleting}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
          Type{" "}
          <span className="font-mono text-slate-900 dark:text-slate-100">
            {supplierName}
          </span>{" "}
          to confirm
        </label>
        <input
          type="text"
          autoFocus
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={deleting}
          placeholder={supplierName}
          className="mb-5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-red-500 dark:focus:ring-red-500/30"
        />

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={deleting}
            className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={
              deleting ||
              confirmText.trim().toLowerCase() !==
                supplierName.trim().toLowerCase()
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete supplier
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
