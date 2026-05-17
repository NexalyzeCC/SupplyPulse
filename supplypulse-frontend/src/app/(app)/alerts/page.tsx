import Link from "next/link";
import {
  BellOff,
  Mail,
  MessageSquare,
  ArrowRight,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import { createClient } from "@/lib/supabase/server";
import {
  getScoreColor,
  getScoreTier,
  getDirectionMeta,
  getCriticalityColor,
  formatDate,
} from "@/lib/utils";
import type { Supplier, SupplierScore } from "@/lib/types/types";

// ─── Flattened alert entry ────────────────────────────────────────────────────

interface AlertEntry {
  id: string;
  channel: "email" | "slack";
  sentAt: string;
  supplierId: string;
  supplierName: string;
  criticality: Supplier["criticality"];
  alertThreshold: number;
  score: number | null;
  direction: SupplierScore["direction"] | null;
}

// ─── Timeline date grouping ───────────────────────────────────────────────────

type GroupLabel = "Today" | "Yesterday" | "This week" | "This month" | "Older";

function groupLabel(sentAt: string): GroupLabel {
  const now   = new Date();
  const entry = new Date(sentAt);

  // Strip time component for day-accurate comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day   = new Date(entry.getFullYear(), entry.getMonth(), entry.getDate());
  const diffDays = Math.round(
    (today.getTime() - day.getTime()) / (1_000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7)  return "This week";
  if (diffDays <= 30) return "This month";
  return "Older";
}

const GROUP_ORDER: GroupLabel[] = [
  "Today",
  "Yesterday",
  "This week",
  "This month",
  "Older",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Supabase types nested FK joins as T[] even for many-to-one relationships.
 * At runtime the value is a single object or null; this helper normalises it.
 */
function oneOrNull<T>(value: unknown): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return value as T;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getAlerts(): Promise<AlertEntry[]> {
  const supabase = await createClient();

  // Supabase infers FK joins from schema; aliases keep the shape readable
  const { data, error } = await supabase
    .from("alert_log")
    .select(
      `
      id,
      channel,
      sent_at,
      supplier_id,
      score_id,
      supplier:suppliers ( id, name, criticality, alert_threshold ),
      score:supplier_scores ( score, direction )
    `,
    )
    .order("sent_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  if (!data) return [];

  return data.map((row) => {
    // Supabase types nested FK joins as arrays; normalise to single object or null
    const sup = oneOrNull<{
      id: string;
      name: string;
      criticality: Supplier["criticality"];
      alert_threshold: number;
    }>(row.supplier);

    const sc = oneOrNull<{
      score: number;
      direction: SupplierScore["direction"];
    }>(row.score);

    return {
      id:             row.id as string,
      channel:        row.channel as "email" | "slack",
      sentAt:         row.sent_at as string,
      supplierId:     (sup?.id ?? row.supplier_id) as string,
      supplierName:   sup?.name ?? "Unknown supplier",
      criticality:    sup?.criticality ?? "medium",
      alertThreshold: sup?.alert_threshold ?? 40,
      score:          sc?.score ?? null,
      direction:      sc?.direction ?? null,
    };
  });
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ alerts }: { alerts: AlertEntry[] }) {
  const emailCount = alerts.filter((a) => a.channel === "email").length;
  const slackCount = alerts.filter((a) => a.channel === "slack").length;

  return (
    <dl className="grid grid-cols-3 gap-4">
      {[
        { label: "Total alerts", value: alerts.length, icon: Bell,         iconCls: "text-blue-600 dark:text-blue-400",   bgCls: "bg-blue-50 dark:bg-blue-950/40"   },
        { label: "Email",        value: emailCount,     icon: Mail,         iconCls: "text-slate-600 dark:text-slate-400",  bgCls: "bg-slate-100 dark:bg-slate-800" },
        { label: "Slack",        value: slackCount,     icon: MessageSquare,iconCls: "text-purple-600 dark:text-purple-400", bgCls: "bg-purple-50 dark:bg-purple-950/40" },
      ].map(({ label, value, icon: Icon, iconCls, bgCls }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-black/20"
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bgCls}`}>
            <Icon className={`h-4 w-4 ${iconCls}`} />
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
              {value}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

// ─── Alert card ───────────────────────────────────────────────────────────────

function AlertCard({ entry }: { entry: AlertEntry }) {
  const scoreColors  = entry.score !== null ? getScoreColor(entry.score) : null;
  const tier         = entry.score !== null ? getScoreTier(entry.score)  : null;
  const dir          = entry.direction      ? getDirectionMeta(entry.direction) : null;
  const critClass    = getCriticalityColor(entry.criticality);

  return (
    <article className={`
      flex gap-4 rounded-xl border bg-white p-4 shadow-sm
      transition-shadow hover:shadow-md dark:bg-slate-900/55 dark:shadow-black/20 dark:hover:shadow-black/35
      ${scoreColors ? scoreColors.border : "border-slate-200 dark:border-slate-800"}
    `}>
      {/* Score circle */}
      <div className={`
        flex h-14 w-14 shrink-0 flex-col items-center justify-center
        rounded-full ring-4 font-bold tabular-nums
        ${scoreColors
          ? `${scoreColors.bg} ${scoreColors.text} ${scoreColors.ring}`
          : "bg-slate-100 text-slate-400 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700"
        }
      `}>
        {entry.score !== null ? (
          <>
            <span className="text-xl leading-none">{entry.score}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide opacity-60">
              /100
            </span>
          </>
        ) : (
          <span className="text-xs font-semibold">N/A</span>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Top row */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/suppliers/${entry.supplierId}`}
              className="truncate font-semibold text-slate-900 transition-colors hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-400"
            >
              {entry.supplierName}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {tier && scoreColors && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${scoreColors.badge}`}>
                  {tier}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${critClass}`}>
                {entry.criticality}
              </span>
            </div>
          </div>

          {/* Channel + time */}
          <div className="flex shrink-0 flex-col items-end gap-1">
            <ChannelBadge channel={entry.channel} />
            <time
              dateTime={entry.sentAt}
              className="text-[11px] text-slate-400 dark:text-slate-500"
            >
              {formatDate(entry.sentAt)}
            </time>
          </div>
        </div>

        {/* Score context line */}
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Score{" "}
          <strong className={scoreColors?.text ?? "text-slate-700 dark:text-slate-200"}>
            {entry.score ?? "—"}
          </strong>
          {" "}dropped below threshold of{" "}
          <strong>{entry.alertThreshold}</strong>.
          {dir && (
            <span className={`ml-1.5 inline-flex items-center gap-0.5 font-medium ${dir.className}`}>
              <dir.icon className="h-3 w-3" />
              {dir.label}
            </span>
          )}
        </p>

        {/* CTA */}
        <Link
          href={`/suppliers/${entry.supplierId}`}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          View supplier
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}

// ─── Channel badge ────────────────────────────────────────────────────────────

function ChannelBadge({ channel }: { channel: "email" | "slack" }) {
  if (channel === "email") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        <Mail className="h-3 w-3" />
        Email
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 ring-1 ring-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900/55">
      <MessageSquare className="h-3 w-3" />
      Slack
    </span>
  );
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AlertsPage() {
  const alerts = await getAlerts();

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title="No alerts yet"
        description="Alerts fire when a supplier's score drops below its configured threshold and falls more than 10 points since the last scan. They will appear here automatically."
        action={{ label: "Go to dashboard", href: "/dashboard", icon: LayoutDashboard }}
      />
    );
  }

  // Group alerts by date bucket, preserving display order
  const groups = new Map<GroupLabel, AlertEntry[]>();
  for (const label of GROUP_ORDER) groups.set(label, []);
  for (const alert of alerts) {
    const key = groupLabel(alert.sentAt);
    groups.get(key)!.push(alert);
  }

  // Remove empty groups
  const visibleGroups = GROUP_ORDER.filter(
    (label) => (groups.get(label)?.length ?? 0) > 0,
  );

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <StatsBar alerts={alerts} />

      {/* Timeline */}
      <div className="space-y-8">
        {visibleGroups.map((label) => (
          <section key={label} aria-labelledby={`group-${label}`}>
            {/* Group header */}
            <div className="mb-3 flex items-center gap-3">
              <h2
                id={`group-${label}`}
                className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {label}
              </h2>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {groups.get(label)!.length} alert
                {groups.get(label)!.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Alert cards */}
            <div className="space-y-3">
              {groups.get(label)!.map((entry) => (
                <AlertCard key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
        Showing the most recent 200 alerts · Older history available via API
      </p>
    </div>
  );
}
