"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIES,
  COUNTRIES,
  CRITICALITY_LEVELS,
  CRITICALITY_LABELS,
  DEFAULT_ALERT_THRESHOLD,
} from "@/lib/constants";
import { getScoreColor, getScoreTier } from "@/lib/utils";
import type { Supplier } from "@/lib/types/types";

// ─── Criticality card metadata ────────────────────────────────────────────────

const CRIT_META: Record<
  Supplier["criticality"],
  { description: string; dotClass: string }
> = {
  low: {
    description: "Minor impact if disrupted. Alternatives readily available.",
    dotClass: "bg-slate-400",
  },
  medium: {
    description: "Moderate impact. Some contingency options exist.",
    dotClass: "bg-amber-500",
  },
  high: {
    description: "Significant impact. Limited alternative suppliers.",
    dotClass: "bg-orange-500",
  },
  critical: {
    description: "Operations halt immediately if supply is disrupted.",
    dotClass: "bg-red-500",
  },
};

// ─── Form value type ──────────────────────────────────────────────────────────

interface FormValues {
  name: string;
  country: string;
  category: string;
  criticality: Supplier["criticality"];
  alert_threshold: number;
  slack_webhook: string;
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

/** Map a Supplier row (nullable fields) onto the form's controlled string values. */
function toFormValues(supplier?: Supplier): FormValues {
  if (!supplier) {
    return {
      name: "",
      country: "",
      category: "",
      criticality: "medium",
      alert_threshold: DEFAULT_ALERT_THRESHOLD,
      slack_webhook: "",
    };
  }
  return {
    name: supplier.name,
    country: supplier.country ?? "",
    category: supplier.category ?? "",
    criticality: supplier.criticality,
    alert_threshold: supplier.alert_threshold,
    slack_webhook: supplier.slack_webhook ?? "",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="flex items-center gap-1 text-xs text-slate-400">
          <Info className="h-3 w-3 shrink-0" />
          {hint}
        </p>
      )}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600" role="alert">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls = (hasError?: boolean) =>
  [
    "h-10 w-full rounded-lg border px-3 text-sm text-slate-900",
    "placeholder:text-slate-400 focus:outline-none focus:ring-2",
    "focus:ring-blue-500 transition-colors",
    hasError
      ? "border-red-400 bg-red-50"
      : "border-slate-300 bg-white hover:border-slate-400",
  ].join(" ");

// ─── Props ────────────────────────────────────────────────────────────────────

interface SupplierFormProps {
  /**
   * Pass an existing Supplier to switch the form into edit mode.
   * Undefined = create mode.
   */
  supplier?: Supplier;
  /**
   * Where Cancel / Back links navigate to.
   * Defaults to "/dashboard".
   */
  cancelHref?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SupplierForm({
  supplier,
  cancelHref = "/dashboard",
}: SupplierFormProps) {
  const router = useRouter();
  const isEdit = !!supplier;

  const [values, setValues] = useState<FormValues>(() =>
    toFormValues(supplier),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // ── Field helpers ──

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // ── Validation ──

  function validate(): boolean {
    const next: FieldErrors = {};

    if (!values.name.trim())
      next.name = "Supplier name is required.";
    else if (values.name.trim().length > 100)
      next.name = "Name must be 100 characters or fewer.";

    if (values.alert_threshold < 0 || values.alert_threshold > 100)
      next.alert_threshold = "Threshold must be between 0 and 100.";

    if (
      values.slack_webhook &&
      !values.slack_webhook.startsWith("https://hooks.slack.com/")
    )
      next.slack_webhook =
        "Must be a valid Slack Incoming Webhook URL (https://hooks.slack.com/…).";

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── Submit ──

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    const supabase = createClient();
    const payload = {
      name: values.name.trim(),
      country: values.country || null,
      category: values.category || null,
      criticality: values.criticality,
      alert_threshold: values.alert_threshold,
      slack_webhook: values.slack_webhook.trim() || null,
    };

    if (isEdit) {
      // ── Edit mode: update existing row ──
      const { error } = await supabase
        .from("suppliers")
        .update(payload)
        .eq("id", supplier.id);

      if (error) {
        setServerError(error.message);
        setSubmitting(false);
        return;
      }

      router.push(`/suppliers/${supplier.id}`);
      router.refresh();
    } else {
      // ── Create mode: insert new row, get back the id ──
      const { data, error } = await supabase
        .from("suppliers")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        setServerError(error?.message ?? "Unexpected error. Please try again.");
        setSubmitting(false);
        return;
      }

      // Phase 5 hook: trigger initial agent scan
      // await fetch("/api/score", {
      //   method: "POST",
      //   body: JSON.stringify({ supplierId: data.id }),
      // });

      router.push("/dashboard");
      router.refresh();
    }
  }

  // ── Derived values for live threshold preview ──
  const thresholdColors = getScoreColor(values.alert_threshold);
  const thresholdTier = getScoreTier(values.alert_threshold);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link */}
      <Link
        href={cancelHref}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEdit ? "Back to supplier" : "Back to dashboard"}
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* ── Card header ── */}
        <div className="border-b border-slate-100 px-8 py-6">
          <h1 className="text-xl font-bold text-slate-900">
            {isEdit ? `Edit ${supplier.name}` : "Add a supplier"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isEdit
              ? "Update the supplier's profile. Any changes take effect on the next scan."
              : "Once saved, trigger a scan to generate an initial risk score in under 60 seconds."}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-8 px-8 py-6">

            {/* ── Basic information ── */}
            <section aria-labelledby="section-basic">
              <h2
                id="section-basic"
                className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Basic information
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field
                    label="Supplier name"
                    htmlFor="name"
                    required
                    error={errors.name}
                  >
                    <input
                      id="name"
                      type="text"
                      value={values.name}
                      onChange={(e) => set("name", e.target.value)}
                      placeholder="e.g. Apex Components Ltd"
                      maxLength={100}
                      autoFocus={!isEdit}
                      className={inputCls(!!errors.name)}
                    />
                  </Field>
                </div>

                <Field label="Country" htmlFor="country">
                  <select
                    id="country"
                    value={values.country}
                    onChange={(e) => set("country", e.target.value)}
                    className={inputCls()}
                  >
                    <option value="">Select a country…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Category" htmlFor="category">
                  <select
                    id="category"
                    value={values.category}
                    onChange={(e) => set("category", e.target.value)}
                    className={inputCls()}
                  >
                    <option value="">Select a category…</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>

            {/* ── Criticality ── */}
            <section aria-labelledby="section-criticality">
              <h2
                id="section-criticality"
                className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Criticality
              </h2>
              <p className="mb-4 text-xs text-slate-500">
                How severely would your operations be affected if this supplier
                could not deliver?
              </p>
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                role="radiogroup"
                aria-label="Criticality level"
              >
                {CRITICALITY_LEVELS.map((level) => {
                  const meta = CRIT_META[level];
                  const selected = values.criticality === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set("criticality", level)}
                      className={[
                        "flex flex-col items-start gap-2 rounded-xl border p-3.5",
                        "text-left transition-all",
                        selected
                          ? "border-blue-500 bg-blue-50 shadow-sm ring-2 ring-blue-200"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`}
                        />
                        {selected && (
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <span
                        className={`text-sm font-semibold capitalize ${
                          selected ? "text-blue-700" : "text-slate-700"
                        }`}
                      >
                        {CRITICALITY_LABELS[level]}
                      </span>
                      <span className="text-[11px] leading-4 text-slate-500">
                        {meta.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ── Alert settings ── */}
            <section aria-labelledby="section-alerts">
              <h2
                id="section-alerts"
                className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Alert settings
              </h2>
              <div className="grid gap-5">
                <Field
                  label="Alert threshold"
                  htmlFor="threshold"
                  hint="An alert fires when the score drops below this value AND falls more than 10 points since the last scan."
                  error={errors.alert_threshold}
                >
                  <div className="space-y-3">
                    <input
                      id="threshold"
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={values.alert_threshold}
                      onChange={(e) =>
                        set("alert_threshold", Number(e.target.value))
                      }
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={values.alert_threshold}
                          onChange={(e) =>
                            set(
                              "alert_threshold",
                              Math.max(0, Math.min(100, Number(e.target.value))),
                            )
                          }
                          className="h-8 w-16 rounded-lg border border-slate-300 px-2 text-center text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-500">/ 100</span>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${thresholdColors.badge}`}
                      >
                        Alert fires in the <strong>{thresholdTier}</strong> zone
                      </span>
                    </div>
                  </div>
                </Field>

                <Field
                  label="Slack webhook URL"
                  htmlFor="slack"
                  hint="Optional. Paste an Incoming Webhook URL to receive Slack notifications."
                  error={errors.slack_webhook}
                >
                  <input
                    id="slack"
                    type="url"
                    value={values.slack_webhook}
                    onChange={(e) => set("slack_webhook", e.target.value)}
                    placeholder="https://hooks.slack.com/services/…"
                    className={inputCls(!!errors.slack_webhook)}
                  />
                </Field>
              </div>
            </section>

            {/* ── Server error ── */}
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>{serverError}</span>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between border-t border-slate-100 px-8 py-5">
            <Link
              href={cancelHref}
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEdit ? "Saving changes…" : "Saving…"}
                </>
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Save supplier"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
