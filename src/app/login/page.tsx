import { LoginView } from "@/components/auth/LoginView";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { redirect } from "next/navigation";

export const metadata = { robots: { index: false } };

export default async function LoginPage() {
  const supabase = await createAuthServerClient();
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/");
  }
  return <LoginView />;
}
