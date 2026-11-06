/** Readora's mark: three spines, one pulled out, like a book being borrowed. */
export function Wordmark({ tone = "ink" }: { tone?: "ink" | "light" }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 28 28" className="size-7" aria-hidden>
        <rect x="3" y="6" width="6" height="19" rx="1" fill="#1F4D3A" />
        <rect x="10.5" y="3" width="6" height="22" rx="1" fill="#6B1E2A" transform="rotate(-9 13.5 25)" />
        <rect x="18" y="8" width="6" height="17" rx="1" fill="#1E2F55" />
        <rect x="2" y="25" width="24" height="2" rx="1" fill={tone === "light" ? "#e2c275" : "currentColor"} opacity="0.85" />
      </svg>
      <span
        className={`font-serif text-[21px] font-semibold tracking-[-0.01em] ${tone === "light" ? "text-white" : "text-ink"}`}
        style={{ fontVariationSettings: '"opsz" 32' }}
      >
        Readora
      </span>
    </span>
  );
}
