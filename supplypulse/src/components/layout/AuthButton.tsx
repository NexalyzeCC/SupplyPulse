import { createClient } from "@/lib/supabase/server";
import AuthButtonClient from "./AuthButtonClient";

export default async function AuthButton() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AuthButtonClient email={user?.email ?? null} />;
}
