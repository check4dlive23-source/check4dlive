import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageLayout } from "@/components/layout/PageLayout";
import type { Metadata } from "next";

type PageProps = {
  params: { slug: string };
};

function parseSlug(slug: string): { date: string; operator: string } | null {
  const match = slug.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (!match) return null;
  return { date: match[1], operator: match[2] };
}

const OPERATOR_LABELS: Record<string, string> = {
  magnum: "Magnum 4D",
  damacai: "Da Ma Cai",
  toto: "Sports Toto",
  cashsweep: "Cash Sweep",
  sarawak: "Cash Sweep",
  sabah: "Sabah 88",
  sabah88: "Sabah 88",
  sandakan: "Sandakan 4D",
  stc: "Sandakan 4D",
  singapore: "Singapore Pools",
  sgpools: "Singapore Pools",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const parsed = parseSlug(params.slug);
  if (!parsed) return { title: "Draw Result | Check4D" };
  const { date, operator } = parsed;
  const opLabel = OPERATOR_LABELS[operator] ?? operator;
  return {
    title: `${opLabel} ${date} Draw Result | Check4D Terminal`,
    description: `${opLabel} 4D draw result for ${date}. First prize, second prize, third prize, special and consolation numbers.`,
  };
}

export const revalidate = 3600;

export default async function DrawPage({ params }: PageProps) {
  const parsed = parseSlug(params.slug);
  if (!parsed) notFound();

  const { date, operator } = parsed;
  const opLabel = OPERATOR_LABELS[operator] ?? operator;

  const supabase = createClient();
  if (!supabase) notFound();

  const { data, error } = await supabase
    .from("draw_results_v2")
    .select("*")
    .eq("draw_date", date)
    .eq("operator", operator)
    .maybeSingle();

  if (error || !data) notFound();

  const special: string[] = (data.special_numbers as string[]) ?? [];
  const consolation: string[] = (data.consolation_numbers as string[]) ?? [];

  return (
    <PageLayout
      title="DRAW "
      titleAccent="RESULT"
      subtitle={`${opLabel} · ${date}`}
      showBack
    >
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "1ST PRIZE", value: data.first_prize, color: "#FFD700" },
            { label: "2ND PRIZE", value: data.second_prize, color: "#C0C0C0" },
            { label: "3RD PRIZE", value: data.third_prize, color: "#CD7F32" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: "linear-gradient(135deg, #0d1f3c, #0a0e1a)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "16px 12px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: 8 }}>
                {label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: "var(--font-jetbrains)", letterSpacing: "0.05em" }}>
                {(value as string) ?? "—"}
              </div>
            </div>
          ))}
        </div>

        {special.length > 0 && (
          <div>
            <h3 style={{ fontSize: 11, color: "rgba(0,229,255,0.6)", letterSpacing: "0.2em", marginBottom: 12 }}>
              SPECIAL PRIZES
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {special.map((num, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(0,229,255,0.05)",
                    border: "1px solid rgba(0,229,255,0.15)",
                    borderRadius: 8,
                    padding: "10px 4px",
                    textAlign: "center",
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#00E5FF",
                  }}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        )}

        {consolation.length > 0 && (
          <div>
            <h3 style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", marginBottom: 12 }}>
              CONSOLATION PRIZES
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {consolation.map((num, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                    padding: "10px 4px",
                    textAlign: "center",
                    fontFamily: "var(--font-jetbrains)",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.6)",
                  }}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.draw_no && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
            DRAW NO: {data.draw_no as string}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
