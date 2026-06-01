"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalize4D } from "@/lib/number-intelligence";

interface NumberSearchBarProps {
  currentNumber: string;
}

export function NumberSearchBar({ currentNumber }: NumberSearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(currentNumber);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = normalize4D(value);
    if (/^\d{4}$/.test(n)) {
      router.push(`/number/${n}`);
    }
  };

  return (
    <form onSubmit={submit} className="flex gap-2 max-w-md">
      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="0000"
        className="flex-1 rounded-lg border border-line-strong bg-surface-3 px-3 py-2 font-number text-lg text-foreground tracking-widest placeholder:text-dim focus:outline-none focus:border-gold/50"
        aria-label="4D number search"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-gold/20 border border-gold/40 px-4 py-2 text-sm font-semibold text-gold hover:bg-gold/30 transition-colors"
      >
        查看
      </button>
    </form>
  );
}
