import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
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
    <>
      {/* Fixed sidebar — sits outside normal document flow */}
      <Sidebar email={user.email ?? null} />

      {/* Main column — offset by sidebar width, fills remaining viewport */}
      <div className="flex min-h-screen flex-1 flex-col pl-64">
        {/*
         * AuthButton is a server component (reads user via getUser).
         * Passing it as a slot prop keeps Header a pure client component
         * while still rendering user info server-side on first paint.
         */}
        <Header auth={<AuthButton />} />

        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </>
  );
}
