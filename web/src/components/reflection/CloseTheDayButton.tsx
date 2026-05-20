"use client";

type Props = {
  hasReflection: boolean;
};

export function CloseTheDayButton({ hasReflection }: Props) {
  function open() {
    window.dispatchEvent(new CustomEvent("shadow:reflection:open"));
  }

  return (
    <button
      onClick={open}
      className={[
        "flex-1 rounded-lg px-4 py-2.5 text-[12px] font-medium transition-all",
        hasReflection
          ? "border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          : "border border-[var(--accent-warm)] text-[var(--accent-warm)] hover:bg-[var(--accent-warm)] hover:text-black",
      ].join(" ")}
    >
      {hasReflection ? "Edit reflection" : "Close the day"}
    </button>
  );
}
