import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";
import AuthButton from "@/components/layout/AuthButton";

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

  return (
    /*
     * AppShell is a client component that owns the mobile sidebar toggle state.
     * Passing AuthButton and children as slots keeps them server-rendered
     * while still allowing client-side open/close logic.
     */
    <AppShell email={user.email ?? null} auth={<AuthButton />}>
      {children}
    </AppShell>
  );
}
