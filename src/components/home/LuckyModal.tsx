"use client";
import { useState, useEffect, useCallback } from "react";
import { useLang } from "@/lib/language-context";

type GameType = "4d" | "3d" | "5d" | "6d" | "jackpot4d" | "jackpotgold" | "magnumlife" | "damacai3plus3d" | "lotto";

const ZODIACS = ["RAT","OX","TIGER","RABBIT","DRAGON","SNAKE","HORSE","GOAT","MONKEY","ROOSTER","DOG","PIG"];
const LOTTO_OPTIONS = [
  { label: "6/45", max: 45 },
  { label: "6/50", max: 50 },
  { label: "6/55", max: 55 },
  { label: "6/58", max: 58 },
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function rand4D() { return String(randInt(0, 9999)).padStart(4, "0"); }
function rand3D() { return String(randInt(0, 999)).padStart(3, "0"); }
function rand5D() { return String(randInt(0, 99999)).padStart(5, "0"); }
function rand6D() { return String(randInt(0, 999999)).padStart(6, "0"); }

function generateNumbers(game: GameType, lottoMax: number): { numbers: string[]; zodiac?: string; bonus?: number; extra?: string } {
  switch (game) {
    case "4d": return { numbers: [rand4D()] };
    case "3d": return { numbers: [rand3D()] };
    case "5d": return { numbers: [rand5D()] };
    case "6d": return { numbers: [rand6D()] };
    case "jackpot4d": return { numbers: [rand4D(), rand4D()] };
    case "jackpotgold": {
      const digits = Array.from({ length: 6 }, () => String(randInt(0, 9)));
      const golden = String(randInt(0, 19)).padStart(2, "0");
      return { numbers: digits, extra: golden };
    }
    case "magnumlife": {
      const pool = Array.from({ length: 36 }, (_, i) => i + 1);
      const shuffled = pool.sort(() => Math.random() - 0.5);
      const winning = shuffled.slice(0, 8).sort((a, b) => a - b);
      return { numbers: winning.map(String) };
    }
    case "damacai3plus3d": {
      const n1 = rand3D(), n2 = rand3D(), n3 = rand3D();
      const zodiac = ZODIACS[randInt(0, 11)];
      return { numbers: [n1, n2, n3], zodiac };
    }
    case "lotto": {
      const pool = Array.from({ length: lottoMax }, (_, i) => i + 1);
      const shuffled = pool.sort(() => Math.random() - 0.5);
      const balls = shuffled.slice(0, 6).sort((a, b) => a - b);
      return { numbers: balls.map(String) };
    }
    default: return { numbers: [rand4D()] };
  }
}

const GAMES: { id: GameType; label: string }[] = [
  { id: "4d", label: "4D" },
  { id: "3d", label: "3D" },
  { id: "5d", label: "5D" },
  { id: "6d", label: "6D" },
  { id: "jackpot4d", label: "4D Jackpot" },
  { id: "jackpotgold", label: "Jackpot Gold" },
  { id: "magnumlife", label: "Magnum Life" },
  { id: "damacai3plus3d", label: "3+3D Bonus" },
  { id: "lotto", label: "Lotto" },
];

interface LuckyModalProps {
  open: boolean;
  onClose: () => void;
}

export function LuckyModal({ open, onClose }: LuckyModalProps) {
  const { t } = useLang();
  const [game, setGame] = useState<GameType>("4d");
  const [lottoMax, setLottoMax] = useState(45);
  const [result, setResult] = useState<ReturnType<typeof generateNumbers> | null>(null);
  const [rolling, setRolling] = useState(false);
  const [rollingNums, setRollingNums] = useState<string[]>([]);
  const [step, setStep] = useState<"select" | "result">("select");

  const handleGenerate = useCallback(() => {
    setRolling(true);
    setStep("result");
    let count = 0;
    const interval = setInterval(() => {
      const g = generateNumbers(game, lottoMax);
      setRollingNums(g.numbers);
      count++;
      if (count > 12) {
        clearInterval(interval);
        const final = generateNumbers(game, lottoMax);
        setResult(final);
        setRollingNums([]);
        setRolling(false);
      }
    }, 80);
  }, [game, lottoMax]);

  const handleAgain = () => {
    setResult(null);
    setRolling(false);
    setRollingNums([]);
    handleGenerate();
  };

  useEffect(() => {
    if (!open) {
      setStep("select");
      setResult(null);
      setRolling(false);
    }
  }, [open]);

  if (!open) return null;

  const displayNums = rolling ? rollingNums : result?.numbers ?? [];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", maxWidth: 420, background: "linear-gradient(135deg, #0d1f3c, #070710)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 20, overflow: "hidden", boxShadow: "0 0 60px rgba(0,229,255,0.15)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, color: "rgba(0,229,255,0.6)", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "var(--font-jetbrains)" }}>CHECK4D TERMINAL</p>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "white", marginTop: 4 }}>{t("luckyNumber")}</h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.5)", width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        {step === "select" ? (
          <div style={{ padding: "20px 24px 24px" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>{t("luckySelectGame")}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {GAMES.map((g) => (
                <button key={g.id} onClick={() => setGame(g.id)}
                  style={{ padding: "14px 8px", borderRadius: 10, border: game === g.id ? "1px solid #00E5FF" : "1px solid rgba(255,255,255,0.08)", background: game === g.id ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.03)", color: game === g.id ? "#00E5FF" : "rgba(255,255,255,0.5)", cursor: "pointer", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-jetbrains)" }}>{g.label}</span>
                </button>
              ))}
            </div>
            {game === "lotto" && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>选择范围</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {LOTTO_OPTIONS.map((opt) => (
                    <button key={opt.max} onClick={() => setLottoMax(opt.max)}
                      style={{ flex: 1, padding: "8px 4px", borderRadius: 8, border: lottoMax === opt.max ? "1px solid #00E5FF" : "1px solid rgba(255,255,255,0.08)", background: lottoMax === opt.max ? "rgba(0,229,255,0.1)" : "transparent", color: lottoMax === opt.max ? "#00E5FF" : "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, fontFamily: "var(--font-jetbrains)" }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleGenerate}
              style={{ width: "100%", padding: 16, borderRadius: 12, background: "linear-gradient(135deg, #00E5FF, #0080FF)", color: "#050816", fontWeight: 900, fontSize: 15, cursor: "pointer", border: "none", boxShadow: "0 4px 28px rgba(0,229,255,0.4)", letterSpacing: "0.05em" }}>
              ✨ {t("luckyGenerate")}
            </button>
          </div>
        ) : (
          <div style={{ padding: "20px 24px 24px" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16, textAlign: "center" }}>{t("luckyNumberTitle")}</p>
            {/* Numbers display */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 16, minHeight: 60 }}>
              {game === "magnumlife" ? (
                displayNums.map((n, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "50%", background: rolling ? "rgba(255,255,255,0.1)" : "rgba(255,215,0,0.15)", border: rolling ? "1px solid rgba(255,255,255,0.2)" : "2px solid #FFD700", fontSize: 16, fontWeight: 900, color: rolling ? "rgba(255,255,255,0.5)" : "#FFD700", fontFamily: "var(--font-jetbrains)", transition: "all 0.1s" }}>
                    {n}
                  </span>
                ))
              ) : game === "jackpotgold" ? (
                <div style={{ textAlign: "center", width: "100%" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 8 }}>
                    {displayNums.map((n, i) => (
                      <span key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 44, borderRadius: 8, background: rolling ? "rgba(255,215,0,0.05)" : "rgba(255,215,0,0.1)", border: rolling ? "1px solid rgba(255,215,0,0.2)" : "1px solid rgba(255,215,0,0.4)", fontSize: 20, fontWeight: 900, color: "#FFD700", fontFamily: "var(--font-jetbrains)" }}>
                        {n}
                      </span>
                    ))}
                    {!rolling && result?.extra && (
                      <>
                        <span style={{ color: "rgba(255,255,255,0.3)", alignSelf: "center", fontSize: 14 }}>+</span>
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 8, background: "rgba(255,176,32,0.15)", border: "2px solid #FFB020", fontSize: 18, fontWeight: 900, color: "#FFB020", fontFamily: "var(--font-jetbrains)" }}>
                          {result.extra}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ) : game === "lotto" ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {displayNums.map((n, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: "50%", background: rolling ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.12)", border: rolling ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.3)", fontSize: 16, fontWeight: 900, color: "white", fontFamily: "var(--font-jetbrains)", transition: "all 0.1s" }}>
                      {n}
                    </span>
                  ))}
                </div>
              ) : (
                displayNums.map((n, i) => (
                  <span key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", minWidth: 60, height: 72, borderRadius: 12, background: rolling ? "rgba(0,229,255,0.05)" : "rgba(0,229,255,0.08)", border: rolling ? "1px solid rgba(0,229,255,0.15)" : "1px solid rgba(0,229,255,0.3)", fontSize: 28, fontWeight: 900, color: rolling ? "rgba(0,229,255,0.4)" : "#00E5FF", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.1em", padding: "0 12px", transition: "all 0.1s", boxShadow: rolling ? "none" : "0 0 20px rgba(0,229,255,0.2)" }}>
                    {n}
                  </span>
                ))
              )}
            </div>
            {/* Zodiac for 3+3D */}
            {!rolling && result?.zodiac && (
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginRight: 8 }}>生肖 Zodiac:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#FFD700" }}>{result.zodiac}</span>
              </div>
            )}
            {!rolling && (
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={handleAgain}
                  style={{ flex: 1, padding: 14, borderRadius: 12, background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.3)", color: "#00E5FF", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  🔄 {t("luckyAgain")}
                </button>
                {(game === "4d" || game === "3d") && result?.numbers[0] && (
                  <a href={`/number/${result.numbers[0]}`}
                    style={{ flex: 1, padding: 14, borderRadius: 12, background: "linear-gradient(135deg, #00E5FF, #0080FF)", color: "#050816", fontWeight: 900, fontSize: 13, textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    📊 {t("luckyViewDetail")}
                  </a>
                )}
              </div>
            )}
            {!rolling && (
              <button onClick={() => setStep("select")}
                style={{ width: "100%", marginTop: 10, padding: "10px", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", fontSize: 12, cursor: "pointer" }}>
                ← {t("luckySelectGame")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
