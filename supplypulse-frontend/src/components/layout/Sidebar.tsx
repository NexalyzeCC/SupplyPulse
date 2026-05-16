"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  Bell,
  ShieldCheck,
  LogOut,
  ChevronRight,
  UserCircle,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type Tier } from "@/lib/plans";

// ─── Nav items ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard",    href: "/dashboard",      icon: LayoutDashboard },
  { label: "Add Supplier", href: "/suppliers/new",  icon: Plus            },
  { label: "Alerts",       href: "/alerts",          icon: Bell            },
  { label: "Profile",      href: "/profile",         icon: UserCircle      },
] as const;

// ─── Props ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  /** Resolved server-side — avoids client-flash on first render. */
  email: string | null;
  /** Subscription tier, drives the plan label under the user's email. */
  tier:  Tier;
  /** Whether the sidebar drawer is open on mobile. */
  isOpen: boolean;
  /** Called when the user requests the sidebar to close on mobile. */
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Sidebar({ email, tier, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = email ? email.slice(0, 2).toUpperCase() : "??";

  return (
    <aside
      aria-label="Main navigation"
      className={[
        // Base — full-height, fixed, dark panel
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 border-r border-slate-800",
        // Slide-in/out on mobile; always visible on desktop
        "transform transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      {/* ── Brand + mobile close button ── */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-600/30">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            SupplyPulse
          </span>
        </div>

        {/* Close button — visible on mobile only */}
        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={[
                "group flex items-center justify-between rounded-lg px-3 py-2.5",
                "text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive
                      ? "text-white"
                      : "text-slate-500 group-hover:text-slate-300"
                  }`}
                />
                {label}
              </span>
              {isActive && (
                <ChevronRight className="h-3.5 w-3.5 text-blue-200" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Divider ── */}
      <div className="mx-4 border-t border-slate-800" />

      {/* ── User + sign-out ── */}
      <div className="shrink-0 px-3 py-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-800/60">
          {/* Avatar + email — entire block links to profile */}
          <Link
            href="/profile"
            aria-label="Open profile"
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200 ring-1 ring-slate-600">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-300">
                {email ?? "Not signed in"}
              </p>
              <p className="text-[10px] text-slate-500">
                {PLANS[tier].name} plan
              </p>
            </div>
          </Link>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="ml-auto shrink-0 rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
            suppressHydrationWarning
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
