import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-8 bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="max-w-md text-center space-y-3">
        <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          404
        </p>
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl">
          Page not found.
        </h2>
        <p className="text-sm text-zinc-500">
          Shadow has no record of this route.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-md border border-zinc-800 bg-[var(--bg-elev2)] px-4 py-2 text-sm hover:bg-[var(--bg-elev3)]"
        >
          Back to Today
        </Link>
      </div>
    </div>
  );
}
