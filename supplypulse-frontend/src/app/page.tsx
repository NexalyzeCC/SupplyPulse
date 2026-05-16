import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Bell,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

// ─── Auth check ───────────────────────────────────────────────────────────────

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ─── Feature cards ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Zap,
    title: "Score in under 60 seconds",
    body: "The AI agent searches news, legal filings, and financial signals, then synthesises a 0–100 health score the moment you add a supplier.",
    iconCls: "text-blue-600",
    bgCls: "bg-blue-50",
  },
  {
    icon: BarChart3,
    title: "30/60/90-day trajectory",
    body: "Daily scans build a score history. Spot a deteriorating trend days before it becomes a supply disruption — not after.",
    iconCls: "text-indigo-600",
    bgCls: "bg-indigo-50",
  },
  {
    icon: Bell,
    title: "Threshold alerts",
    body: "Set a score threshold per supplier. Email and Slack notifications fire automatically when the score drops and falls more than 10 points.",
    iconCls: "text-violet-600",
    bgCls: "bg-violet-50",
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const user = await getUser();

  // Authenticated users go straight to the app
  if (user) redirect("/dashboard");

  return (
    <div className="w-full flex flex-col min-h-screen overflow-x-hidden bg-white">

      {/* ── Nav ── */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900">SupplyPulse</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
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
      <section className="flex flex-1 flex-col items-center justify-center bg-slate-950 px-6 pb-24 pt-40 text-center lg:pt-48">
        {/* Glow blobs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-blue-500/25 blur-3xl" />
          <div className="absolute -bottom-16 left-1/4 h-[400px] w-[400px] rounded-full bg-indigo-600/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-medium text-blue-400">
            <Zap className="h-3.5 w-3.5" />
            AI-powered supply chain risk intelligence
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Monitor supplier risk{" "}
            <span
              style={{
                background: "linear-gradient(to right, #60a5fa, #818cf8)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              before it becomes a crisis
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Add a supplier. The AI agent scans news, legal filings, and
            financial signals and returns a 0–100 health score with an action
            plan — in under 60 seconds.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-7 py-3 text-sm font-semibold text-slate-300 hover:border-slate-500 hover:text-white transition-colors"
            >
              Sign in
            </Link>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Free tier · 3 suppliers · No credit card required
          </p>
        </div>
      </section>

      {/* ── Feature highlights ── */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Everything you need to stay ahead of supply risk
            </h2>
            <p className="mt-3 text-slate-500">
              Built on a transparent AI agent loop — no black boxes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body, iconCls, bgCls }) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-6"
              >
                <div
                  className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${bgCls}`}
                >
                  <Icon className={`h-5 w-5 ${iconCls}`} />
                </div>
                <h3 className="mb-2 text-base font-semibold text-slate-900">
                  {title}
                </h3>
                <p className="text-sm leading-7 text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="bg-slate-950 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Add your first supplier in 60 seconds
          </h2>
          <p className="mt-4 text-slate-400">
            No setup. No credit card. Just a supplier name and a risk score
            waiting in your dashboard.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-colors"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Already have an account? Sign in →
            </Link>
          </div>

          {/* Feature checklist */}
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              "Free tier — 3 suppliers",
              "Daily AI scans",
              "Email + Slack alerts",
              "No credit card needed",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-1.5 text-sm text-slate-500"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600">
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">SupplyPulse</span>
          </div>
          <p className="text-xs text-slate-500">
            Risk scores are indicators only — not financial, legal, or investment
            advice. Always validate with qualified professionals before acting.
          </p>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} SupplyPulse
          </p>
        </div>
      </footer>

    </div>
  );
}
