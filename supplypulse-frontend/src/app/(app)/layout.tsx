import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";
import AuthButton from "@/components/layout/AuthButton";
import { normalizeTier } from "@/lib/plans";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense-in-depth: middleware protects these routes too, but an explicit
  // server-side check ensures we never render the shell for an unauthenticated
  // request that somehow slips past.
  if (!user) {
    redirect("/login");
  }

  // Fetch the user's subscription tier so the sidebar can display the real
  // plan label instead of a hard-coded "Free plan". Falls back to starter
  // when the user has no subscription row or no active subscription.
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("tier, status")
    .eq("user_id", user.id)
    .maybeSingle();
  const tier =
    sub?.status === "active" ? normalizeTier(sub?.tier) : "starter";

  return (
    /*
     * AppShell is a client component that owns the mobile sidebar toggle state.
     * Passing AuthButton and children as slots keeps them server-rendered
     * while still allowing client-side open/close logic.
     */
    <AppShell email={user.email ?? null} tier={tier} auth={<AuthButton />}>
      {children}
    </AppShell>
  );
}
