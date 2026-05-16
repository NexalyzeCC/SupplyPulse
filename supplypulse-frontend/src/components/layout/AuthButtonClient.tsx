"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuthButtonClientProps {
  email: string | null;
}

export default function AuthButtonClient({ email }: AuthButtonClientProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (!email) {
    return (
      <Link
        href="/login"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Sign in
      </Link>
    );
  }

  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      {/* Avatar + email — links to profile */}
      <Link
        href="/profile"
        title="View profile"
        aria-label="View profile"
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-slate-100"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">
          {initials}
        </div>
        <span className="hidden max-w-[160px] truncate text-sm font-medium text-slate-700 sm:block">
          {email}
        </span>
      </Link>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        title="Sign out"
        className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        suppressHydrationWarning
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
