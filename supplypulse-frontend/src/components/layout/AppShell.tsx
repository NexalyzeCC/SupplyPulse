"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface AppShellProps {
  email: string | null;
  /** <AuthButton /> server component passed as a slot from the server layout. */
  auth: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Client wrapper that owns the mobile-sidebar open/close state.
 * This allows Sidebar and Header to share the toggle without turning
 * the server layout into a client component.
 */
export default function AppShell({ email, auth, children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close sidebar whenever the route changes (link tapped on mobile)
  useEffect(() => {
    queueMicrotask(() => setSidebarOpen(false));
  }, [pathname]);

  // Prevent background scrolling while the mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <>
      {/* ── Mobile backdrop ── */}
      <div
        aria-hidden
        onClick={() => setSidebarOpen(false)}
        className={[
          "fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          sidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* ── Sidebar ── */}
      <Sidebar
        email={email}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main column ── */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <Header auth={auth} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
          {children}
        </main>
      </div>
    </>
  );
}
