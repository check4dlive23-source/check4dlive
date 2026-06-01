"use client";

import { useCallback, useEffect, useState } from "react";
import {
  generateLucky,
  LUCKY_GAMES,
  type LuckyResult,
} from "@/lib/lucky-number";

interface LuckyModalProps {
  open: boolean;
  onClose: () => void;
}

function BallCircle({
  n,
  bonus = false,
}: {
  n: number;
  bonus?: boolean;
}) {
  return (
    <span
      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-number ${
        bonus
          ? "border-2 border-gold bg-surface-3 text-gold"
          : "border border-line bg-surface-4 text-foreground"
      }`}
    >
      {n}
    </span>
  );
}

function LuckyResultView({ result }: { result: LuckyResult }) {
  switch (result.type) {
    case "4d":
    case "5d":
    case "6d":
      return (
        <p className="font-number text-4xl md:text-5xl text-gold tracking-[4px] text-center">
          {result.value}
        </p>
      );
    case "jp4d":
      return (
        <div className="text-center space-y-2">
          <p className="font-number text-3xl md:text-4xl text-gold tracking-[3px]">
            {result.a}{" "}
            <span className="text-muted text-2xl mx-1">+</span> {result.b}
          </p>
        </div>
      );
    case "lotto":
      return (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {result.balls.map((b, i) => (
            <BallCircle key={`b-${i}-${b}`} n={b} />
          ))}
          {typeof result.bonus === "number" && (
            <>
              <span className="text-muted text-sm">+</span>
              <BallCircle n={result.bonus} bonus />
            </>
          )}
        </div>
      );
    case "life":
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-center gap-2">
            {result.winning.map((b, i) => (
              <BallCircle key={`w-${i}-${b}`} n={b} />
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {result.bonus.map((b, i) => (
              <BallCircle key={`bn-${i}-${b}`} n={b} bonus />
            ))}
          </div>
        </div>
      );
  }
}

export function LuckyModal({ open, onClose }: LuckyModalProps) {
  const [selectedId, setSelectedId] = useState(LUCKY_GAMES[0].id);
  const [result, setResult] = useState<LuckyResult | null>(null);

  const selected =
    LUCKY_GAMES.find((g) => g.id === selectedId) ?? LUCKY_GAMES[0];

  const runGenerate = useCallback(() => {
    setResult(generateLucky(selected));
  }, [selected]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lucky-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-line bg-surface-2 shadow-2xl">
        <header className="sticky top-0 flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3">
          <h2 id="lucky-modal-title" className="text-lg font-bold text-foreground">
            🍀 幸运号码
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground text-xl leading-none px-2"
            aria-label="关闭"
          >
            ×
          </button>
        </header>

        <div className="p-4 space-y-4">
          <fieldset className="space-y-1">
            <legend className="text-xs text-muted uppercase tracking-wider mb-2">
              选择游戏
            </legend>
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-line bg-surface-3 p-2">
              {LUCKY_GAMES.map((game) => (
                <label
                  key={game.id}
                  className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                    selectedId === game.id
                      ? "bg-surface-4 text-foreground"
                      : "text-muted hover:bg-surface-4/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="lucky-game"
                    value={game.id}
                    checked={selectedId === game.id}
                    onChange={() => {
                      setSelectedId(game.id);
                      setResult(null);
                    }}
                    className="mt-1 shrink-0"
                  />
                  <span>
                    <span className="font-medium text-foreground">{game.label}</span>
                    {game.sublabel && (
                      <span className="block text-[10px] text-muted">
                        {game.sublabel}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {selected.note && (
            <p className="text-xs text-muted text-center">{selected.note}</p>
          )}

          {result && (
            <div className="rounded-lg border border-line bg-surface-3 py-6 px-4">
              <LuckyResultView result={result} />
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={runGenerate}
              className="flex-1 rounded-lg bg-gold/20 border border-gold/40 py-2.5 text-sm font-semibold text-gold hover:bg-gold/30 transition-colors"
            >
              ✨ 产生幸运号码
            </button>
            {result && (
              <button
                type="button"
                onClick={runGenerate}
                className="flex-1 rounded-lg border border-line-strong bg-surface-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-4 transition-colors"
              >
                🔄 再产生一次
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
