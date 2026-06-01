import Link from "next/link";
import type { ReactNode } from "react";

export function SubpageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-line bg-surface-2">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <nav className="flex flex-wrap gap-3 text-xs mb-3">
          <Link href="/" className="text-muted hover:text-foreground">
            Live
          </Link>
          <Link href="/analytics" className="text-muted hover:text-foreground">
            Analytics
          </Link>
          <Link href="/draws" className="text-muted hover:text-foreground">
            Draws
          </Link>
          <Link href="/search" className="text-muted hover:text-foreground">
            Search
          </Link>
        </nav>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
        {children}
      </div>
    </header>
  );
}
