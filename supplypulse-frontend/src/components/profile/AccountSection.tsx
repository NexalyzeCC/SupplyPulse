"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  email:       string;
  memberSince: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year:  "numeric",
      month: "short",
      day:   "numeric",
    });
  } catch {
    return iso;
  }
}

// ─── Reusable input styling ───────────────────────────────────────────────────

const inputCls = (hasError?: boolean) =>
  [
    "h-10 w-full rounded-lg border px-3 text-sm transition-colors",
    "text-slate-900 placeholder:text-slate-400",
    "focus:outline-none focus:ring-2 focus:ring-blue-500",
    "dark:text-slate-100 dark:placeholder:text-slate-500",
    hasError
      ? "border-red-400 bg-red-50 dark:border-red-500/60 dark:bg-red-950/40"
      : "border-slate-300 bg-white hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600",
  ].join(" ");

// ─── Section card wrapper ────────────────────────────────────────────────────

function Card({
  title,
  description,
  icon: Icon,
  children,
}: {
  title:       string;
  description: string;
  icon:        React.ComponentType<{ className?: string }>;
  children:    React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AccountSection({ email, memberSince }: Props) {
  return (
    <div className="space-y-6">
      {/* ── Account overview ── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Account overview
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Email
              </dt>
              <dd className="mt-1 break-all text-sm text-slate-900 dark:text-slate-100">
                {email}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Member since
              </dt>
              <dd className="mt-1 text-sm text-slate-900 dark:text-slate-100">
                {formatDate(memberSince)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ── Update password ── */}
      <Card
        title="Change password"
        description="Pick a strong password (at least 8 characters). You'll stay signed in."
        icon={Lock}
      >
        <PasswordForm currentEmail={email} />
      </Card>
    </div>
  );
}

// ─── Password form ───────────────────────────────────────────────────────────

function PasswordForm({ currentEmail }: { currentEmail: string }) {
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!currentPwd) return "Enter your current password.";
    if (newPwd.length < 8)
      return "New password must be at least 8 characters.";
    if (newPwd === currentPwd)
      return "New password must be different from your current password.";
    if (newPwd !== confirmPwd) return "New passwords don't match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();

      // Re-authenticate to confirm the current password is correct. Supabase
      // doesn't require this for updateUser, but skipping it would let anyone
      // who steals an open session change the password silently.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email:    currentEmail,
        password: currentPwd,
      });
      if (signInErr) {
        setError("Current password is incorrect.");
        toast.error("Couldn't verify current password");
        setSubmitting(false);
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPwd,
      });
      if (updateErr) {
        setError(updateErr.message);
        toast.error("Failed to update password", {
          description: updateErr.message,
        });
        setSubmitting(false);
        return;
      }

      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      toast.success("Password updated", {
        description: "Your new password is active on this device.",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error.";
      setError(msg);
      toast.error("Failed to update password", { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        name="email"
        value={currentEmail}
        readOnly
        autoComplete="username"
        aria-hidden
        className="hidden"
      />

      <div>
        <label
          htmlFor="current-pwd"
          className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          Current password
        </label>
        <input
          id="current-pwd"
          type="password"
          autoComplete="current-password"
          value={currentPwd}
          onChange={(e) => {
            setCurrentPwd(e.target.value);
            setError(null);
          }}
          className={inputCls(!!error)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="new-pwd"
            className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            New password
          </label>
          <input
            id="new-pwd"
            type="password"
            autoComplete="new-password"
            value={newPwd}
            onChange={(e) => {
              setNewPwd(e.target.value);
              setError(null);
            }}
            className={inputCls(!!error)}
          />
        </div>
        <div>
          <label
            htmlFor="confirm-pwd"
            className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            Confirm new password
          </label>
          <input
            id="confirm-pwd"
            type="password"
            autoComplete="new-password"
            value={confirmPwd}
            onChange={(e) => {
              setConfirmPwd(e.target.value);
              setError(null);
            }}
            className={inputCls(!!error)}
          />
        </div>
      </div>

      {error && (
        <p
          className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
          role="alert"
        >
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </button>
      </div>
    </form>
  );
}
