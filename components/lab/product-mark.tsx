/** The product mark: a tuning fork standing in its block, drawn in the data green. */
export function ProductMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="1" y="1" width="30" height="30" fill="var(--data)" />
      <path
        d="M11 6v10a5 5 0 0 0 10 0V6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="square"
      />
      <path d="M16 21v6" stroke="#ffffff" strokeWidth="2.6" />
      <path d="M11 27h10" stroke="#ffffff" strokeWidth="2.2" />
    </svg>
  );
}
