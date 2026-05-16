"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ChevronRight } from "lucide-react";

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
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Header({ auth }: HeaderProps) {
  const pathname = usePathname();
  const { title, crumbs } = usePageMeta(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white/90 px-6 backdrop-blur-md">

      {/* ── Left: breadcrumbs + page title ── */}
      <div className="min-w-0 shrink-0">
        {crumbs.length > 0 && (
          <nav className="mb-0.5 flex items-center gap-1" aria-label="Breadcrumb">
            {crumbs.map((crumb, i) => (
              <span key={crumb} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-slate-400" />}
                {i === 0 ? (
                  <Link
                    href="/dashboard"
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {crumb}
                  </Link>
                ) : (
                  <span className="text-xs font-medium text-slate-600">{crumb}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="truncate text-lg font-semibold leading-none text-slate-900">
          {title}
        </h1>
      </div>

      {/* ── Centre: search (v1 stub) ── */}
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search suppliers…"
            disabled
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-500 placeholder:text-slate-400 disabled:cursor-not-allowed focus:outline-none"
            aria-label="Search suppliers (coming soon)"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] font-medium text-slate-400">
            Soon
          </span>
        </div>
      </div>

      {/* ── Right: AuthButton slot ── */}
      <div className="shrink-0">
        {auth}
      </div>

    </header>
  );
}
