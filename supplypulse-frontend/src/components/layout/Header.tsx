"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ChevronRight, Menu } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

// ─── Page title / breadcrumb map ─────────────────────────────────────────────

function usePageMeta(pathname: string): { title: string; crumbs: string[] } {
  if (pathname === "/dashboard") {
    return { title: "Dashboard", crumbs: [] };
  }
  if (pathname === "/suppliers/new") {
    return { title: "Add Supplier", crumbs: ["Dashboard", "Add Supplier"] };
  }
  if (pathname.startsWith("/suppliers/")) {
    return { title: "Supplier Detail", crumbs: ["Dashboard", "Supplier Detail"] };
  }
  if (pathname === "/alerts") {
    return { title: "Alert History", crumbs: ["Dashboard", "Alerts"] };
  }
  return { title: "SupplyPulse", crumbs: [] };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface HeaderProps {
  /**
   * Pass <AuthButton /> here from the server layout.
   * Using a slot keeps this client component free of any server imports.
   */
  auth?: React.ReactNode;
  /** Called when the hamburger is tapped on mobile. */
  onMenuClick?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Header({ auth, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { title, crumbs } = usePageMeta(pathname);

  return (
    <header className="
      sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3
      border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md
      dark:border-slate-800 dark:bg-slate-900/90
      sm:gap-4 sm:px-6
    ">

      {/* ── Hamburger — mobile only ── */}
      <button
        onClick={onMenuClick}
        aria-label="Open navigation"
        className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* ── Left: breadcrumbs + page title ── */}
      <div className="min-w-0 shrink-0">
        {crumbs.length > 0 && (
          <nav className="mb-0.5 hidden items-center gap-1 sm:flex" aria-label="Breadcrumb">
            {crumbs.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-600" />}
                {i === 0 ? (
                  <Link
                    href="/dashboard"
                    className="text-xs text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  >
                    {crumb}
                  </Link>
                ) : (
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{crumb}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate text-base font-semibold leading-none text-slate-900 dark:text-slate-100 sm:text-lg">
          {title}
        </h1>
      </div>

      {/* ── Centre: search stub — hidden on small screens ── */}
      <div className="hidden flex-1 items-center justify-center px-4 md:flex">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            placeholder="Search suppliers…"
            disabled
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-500 placeholder:text-slate-400 disabled:cursor-not-allowed focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:placeholder:text-slate-600"
            aria-label="Search suppliers (coming soon)"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
            Soon
          </span>
        </div>
      </div>

      {/* Spacer on mobile so AuthButton stays right-aligned */}
      <div className="flex-1 md:hidden" />

      {/* ── Right: theme toggle + AuthButton slot ── */}
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        {auth}
      </div>

    </header>
  );
}
