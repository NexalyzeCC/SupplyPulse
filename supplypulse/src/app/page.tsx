import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Bell,
  TrendingDown,
  BarChart3,
  Globe2,
  ArrowRight,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const STATS = [
  { value: "< 60s", label: "Time to first risk score" },
  { value: "0–100", label: "Dynamic health score per supplier" },
  { value: "5+", label: "Signal sources per scan" },
  { value: "99%", label: "Daily monitoring run completion" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Add a supplier",
    body: "Enter a name, country, category, and criticality level. That's all the agent needs.",
  },
  {
    step: "02",
    title: "Agent scans the web",
    body: "The ReAct agent runs parallel searches across news, legal filings, and financial sources — in under 60 seconds.",
  },
  {
    step: "03",
    title: "Get a score & action plan",
    body: "Receive a 0–100 health score, trajectory direction, ranked signals, and concrete 30-day recommendations.",
  },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time agent loop",
    body: "A bounded ReAct loop per supplier — plan, search, extract, synthesise, act. Predictable cost, no runaway recursion.",
  },
  {
    icon: TrendingDown,
    title: "30/60/90-day trajectory",
    body: "Score history plotted as a curve so you see deterioration days before it becomes a crisis.",
  },
  {
    icon: Bell,
    title: "Threshold alerts",
    body: "Email and Slack notifications fire only when a score drops below your threshold and falls more than 10 points.",
  },
  {
    icon: ShieldCheck,
    title: "Row-Level Security",
    body: "Supabase RLS guarantees your supplier data is invisible to every other account — always.",
  },
  {
    icon: Globe2,
    title: "Multi-source intelligence",
    body: "Tavily-powered web search with Serper fallback. GPT-4o-mini extracts signals; GPT-4o synthesises the final score.",
  },
  {
    icon: BarChart3,
    title: "Cost-transparent",
    body: "Every LLM call logs token counts and cost. Pro users cost ~$0.03 per supplier per day. No surprise bills.",
  },
];

const TIERS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "For individuals exploring supply risk.",
    cta: "Get started free",
    href: "/signup",
    highlight: false,
    features: [
      "3 suppliers monitored",
      "Weekly scans",
      "News signals only",
      "30-day trajectory",
      "Email alerts",
      "Basic recommendations",
    ],
  },
  {
    name: "Pro",
    price: "$149",
    period: "/month",
    description: "For procurement teams that need daily intelligence.",
    cta: "Start Pro trial",
    href: "/signup",
    highlight: true,
    features: [
      "25 suppliers monitored",
      "Daily scans",
      "News + legal + financial",
      "90-day trajectory",
      "Email + Slack alerts",
      "Full AI action plan",
      "PDF risk briefs",
    ],
  },
  {
    name: "Enterprise",
    price: "$999",
    period: "/month",
    description: "For large supply chains that can't afford surprises.",
    cta: "Contact sales",
    href: "/signup",
    highlight: false,
    features: [
      "Unlimited suppliers",
      "6-hour real-time scans",
      "All sources + custom",
      "365-day trajectory",
      "Email + Slack + PagerDuty",
      "Alternative supplier AI",
      "White-label PDF briefs",
      "REST API access",
      "SAP / Oracle connector",
    ],
  },
];

// ─── Score badge (pure CSS, no JS) ───────────────────────────────────────────

function ScoreBadge({
  score,
  label,
  direction,
}: {
  score: number;
  label: string;
  direction: "up" | "down" | "flat";
}) {
  const color =
    score >= 70
      ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
      : score >= 40
        ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
        : "text-red-400 border-red-500/40 bg-red-500/10";

  const arrow =
    direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const arrowColor =
    direction === "up"
      ? "text-emerald-400"
      : direction === "down"
        ? "text-red-400"
        : "text-slate-400";

  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${color}`}
    >
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums">{score}</p>
      </div>
      <span className={`text-xl font-bold ${arrowColor}`}>{arrow}</span>
    </div>
  );
}

// ─── Mock dashboard panel ─────────────────────────────────────────────────────

function MockDashboard() {
  return (
    <div className="w-full max-w-xs sm:max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900/80 p-5 shadow-2xl shadow-blue-950/50 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">Supplier Watchlist</span>
        <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
          Live
        </span>
      </div>
      <div className="space-y-3">
        <ScoreBadge score={82} label="Apex Components Ltd" direction="up" />
        <ScoreBadge score={47} label="Meridian Textiles" direction="down" />
        <ScoreBadge score={23} label="Pacific Freight Co." direction="down" />
        <ScoreBadge score={71} label="Nordic Steel Group" direction="flat" />
      </div>
      <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
        <p className="text-xs font-semibold text-red-400">⚠ Alert fired</p>
        <p className="mt-0.5 text-xs text-slate-400">
          Pacific Freight Co. dropped 31 pts — below threshold of 40.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-white font-sans antialiased flex flex-col">
      {/* ── Nav ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">SupplyPulse</span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-slate-950 pt-28 pb-20 lg:min-h-[92vh] lg:flex lg:items-center">
        {/* Background gradient blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-40 -right-40 h-[700px] w-[700px] rounded-full bg-blue-500/30 blur-3xl" />
          <div className="absolute top-1/2 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-[400px] w-[400px] rounded-full bg-blue-700/25 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
            {/* Copy */}
            <div className="flex-1 text-center lg:text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-400">
                <Zap className="h-3.5 w-3.5" />
                AI-powered supplier risk intelligence
              </div>
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Know your suppliers&apos;{" "}
                <span
                  style={{
                    background: "linear-gradient(to right, #60a5fa, #818cf8)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  health score
                </span>{" "}
                before it&apos;s too late
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
                SupplyPulse monitors your supplier watchlist across news, legal
                filings, and financial signals. The AI agent returns a dynamic
                0–100 risk score with an action plan — in under 60 seconds.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors"
                >
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
                >
                  See how it works
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Free tier includes 3 suppliers. No credit card required.
              </p>
            </div>

            {/* Mock UI */}
            <div className="shrink-0">
              <MockDashboard />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <dl className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <dt className="text-3xl font-extrabold text-slate-900">{s.value}</dt>
                <dd className="mt-1 text-sm text-slate-500">{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              From supplier name to risk score in 3 steps
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              No spreadsheets. No manual research. Just results.
            </p>
          </div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Connector line (desktop) */}
            <div
              aria-hidden
              style={{ background: "linear-gradient(to right, transparent, #bfdbfe, transparent)" }}
              className="absolute top-8 left-[16%] right-[16%] hidden h-px md:block"
            />

            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-slate-100 bg-white p-8 shadow-sm"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="text-sm leading-7 text-slate-500">{item.body}</p>
              </div>
            ))}
          </div>

          {/* Timeline callout */}
          <div className="mt-10 flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-6 py-4">
            <Clock className="h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">
              The entire loop — queries → search → extraction → scoring → persist — completes in{" "}
              <strong>under 60 seconds</strong> for a new supplier.
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="bg-slate-950 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Everything you need to stay ahead of supplier risk
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Built on a transparent, bounded AI agent — no black boxes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-600"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20">
                    <Icon className="h-5 w-5 text-blue-400" />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">{f.title}</h3>
                  <p className="text-sm leading-7 text-slate-400">{f.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Risk tiers explainer ── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Scores you can act on immediately
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Three risk tiers, clear thresholds, no ambiguity.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                range: "70 – 100",
                tier: "Healthy",
                color: "emerald",
                bg: "bg-emerald-50",
                border: "border-emerald-200",
                badge: "bg-emerald-100 text-emerald-700",
                dot: "bg-emerald-500",
                action: "Monitor quarterly. No immediate action required.",
              },
              {
                range: "40 – 69",
                tier: "Watch",
                color: "amber",
                bg: "bg-amber-50",
                border: "border-amber-200",
                badge: "bg-amber-100 text-amber-700",
                dot: "bg-amber-500",
                action:
                  "Begin contingency planning. Identify alternative suppliers.",
              },
              {
                range: "0 – 39",
                tier: "Critical",
                color: "red",
                bg: "bg-red-50",
                border: "border-red-200",
                badge: "bg-red-100 text-red-700",
                dot: "bg-red-500",
                action:
                  "Immediate escalation. Alert fires. Activate backup sourcing.",
              },
            ].map((tier) => (
              <div
                key={tier.tier}
                className={`rounded-2xl border p-6 ${tier.bg} ${tier.border}`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${tier.badge}`}
                  >
                    {tier.tier}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-700">
                    {tier.range}
                  </span>
                </div>
                <div
                  className={`h-2 w-full rounded-full ${tier.dot} opacity-30`}
                />
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {tier.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="border-t border-slate-100 bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              Start free. Upgrade when your watchlist grows.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl p-8 ${
                  tier.highlight
                    ? "bg-blue-600 text-white shadow-2xl shadow-blue-600/30 ring-2 ring-blue-400"
                    : "border border-slate-200 bg-white text-slate-900"
                }`}
              >
                {tier.highlight && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-blue-400 px-3 py-1 text-xs font-bold text-white">
                    Most popular
                  </span>
                )}

                <div className="mb-6">
                  <h3
                    className={`text-lg font-bold ${tier.highlight ? "text-white" : "text-slate-900"}`}
                  >
                    {tier.name}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold">{tier.price}</span>
                    {tier.period && (
                      <span
                        className={`text-sm ${tier.highlight ? "text-blue-200" : "text-slate-500"}`}
                      >
                        {tier.period}
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-2 text-sm ${tier.highlight ? "text-blue-100" : "text-slate-500"}`}
                  >
                    {tier.description}
                  </p>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          tier.highlight ? "text-blue-200" : "text-blue-600"
                        }`}
                      />
                      <span className={tier.highlight ? "text-blue-50" : "text-slate-600"}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={tier.href}
                  className={`block rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                    tier.highlight
                      ? "bg-white text-blue-600 hover:bg-blue-50"
                      : "border border-slate-300 text-slate-900 hover:border-blue-400 hover:text-blue-600"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            All plans include Supabase-backed Row Level Security. Your data is yours.
          </p>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-slate-950 py-24">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Add your first supplier in 60 seconds
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            No setup. No credit card. Just a supplier name and a risk score
            landing in your inbox.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 bg-slate-950 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">SupplyPulse</span>
            </div>
            <p className="text-xs text-slate-500">
              Risk scores are indicators only — not financial or legal advice.
            </p>
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} SupplyPulse
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
