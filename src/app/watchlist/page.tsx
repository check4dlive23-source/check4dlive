import { WatchlistView } from "@/components/watchlist/WatchlistView";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { getNumberScore } from "@/lib/score/queries";
import { redirect } from "next/navigation";

export const metadata = { robots: { index: false } };

export default async function WatchlistPage() {
  const supabase = await createAuthServerClient();
  if (!supabase) redirect("/login");

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: rows } = await supabase
    .from("watchlists")
    .select("number, created_at")
    .order("created_at", { ascending: false });

  const numbers = (rows ?? []).map((r) => r.number as string);
  const items = await Promise.all(
    numbers.map(async (number) => ({
      number,
      score: await getNumberScore(number),
    }))
  );

  return <WatchlistView items={items} />;
}
