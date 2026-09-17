/** Soft edge accents for the landing page — decorative only. */
export function LandingAmbient() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      <span className="ys-ambient-orb ys-ambient-orb-a absolute -start-24 top-[18%] h-56 w-56 rounded-full bg-brand-300/25 blur-3xl sm:h-72 sm:w-72" />
      <span className="ys-ambient-orb ys-ambient-orb-b absolute -end-28 top-[38%] h-64 w-64 rounded-full bg-[#e3d2ad]/30 blur-3xl sm:h-80 sm:w-80" />
      <span className="ys-ambient-orb ys-ambient-orb-c absolute -start-16 bottom-[22%] h-48 w-48 rounded-full bg-brand-200/30 blur-3xl sm:h-64 sm:w-64" />
      <span className="ys-ambient-dot absolute start-[6%] top-[52%] hidden h-2 w-2 rounded-full bg-brand-500/35 sm:block" />
      <span className="ys-ambient-dot ys-ambient-dot-delay absolute end-[8%] top-[28%] hidden h-1.5 w-1.5 rounded-full bg-brand-600/30 sm:block" />
      <span className="ys-ambient-ring absolute -end-10 top-[12%] hidden h-40 w-40 rounded-full border border-brand-300/25 sm:block" />
      <span className="ys-ambient-ring ys-ambient-ring-delay absolute -start-8 bottom-[18%] hidden h-32 w-32 rounded-full border border-[#d4c4a0]/30 sm:block" />
    </div>
  );
}
