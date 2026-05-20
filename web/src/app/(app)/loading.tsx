export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-3 w-32 rounded bg-zinc-800" />
        <div className="h-7 w-48 rounded bg-zinc-800" />
      </div>

      {/* Hero */}
      <div className="h-16 rounded-xl bg-zinc-800/50" />

      {/* State card */}
      <div className="rounded-xl border border-zinc-800 p-5 space-y-3">
        <div className="h-3 w-16 rounded bg-zinc-800" />
        <div className="space-y-2">
          <div className="h-2 rounded bg-zinc-800" />
          <div className="h-2 rounded bg-zinc-800 w-4/5" />
          <div className="h-2 rounded bg-zinc-800 w-3/5" />
        </div>
      </div>

      {/* Quick capture */}
      <div className="rounded-xl border border-zinc-800 p-5 space-y-3">
        <div className="h-3 w-24 rounded bg-zinc-800" />
        <div className="h-24 rounded bg-zinc-800/50" />
      </div>

      {/* Life circle */}
      <div className="rounded-xl border border-zinc-800 p-5 space-y-3">
        <div className="h-3 w-20 rounded bg-zinc-800" />
        <div className="h-48 rounded bg-zinc-800/50" />
      </div>
    </div>
  );
}
