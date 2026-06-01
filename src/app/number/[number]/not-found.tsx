import Link from "next/link";

export default function NumberNotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <p className="font-number text-4xl text-gold mb-2">----</p>
      <h1 className="text-lg font-semibold text-foreground">Invalid 4D number</h1>
      <p className="text-sm text-muted mt-1 mb-6">
        Enter a 4-digit number between 0000 and 9999.
      </p>
      <Link
        href="/"
        className="rounded-lg border border-line-strong bg-surface-3 px-4 py-2 text-sm text-foreground hover:bg-surface-4"
      >
        ← Back to live results
      </Link>
    </div>
  );
}
