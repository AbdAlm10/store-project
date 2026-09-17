/**
 * Drop real screenshots here later:
 * - /public/marketing/storefront.png
 * - /public/marketing/dashboard.png
 * - /public/marketing/analytics.png
 * - /public/marketing/product.png
 *
 * Until then these CSS mockups keep the landing visual.
 */

export function MockStorefront() {
  return (
    <div className="flex h-full flex-col bg-[#f7f8f7] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-brand-100 ring-1 ring-brand-200" />
          <div>
            <div className="h-3.5 w-28 rounded-full bg-slate-800/90" />
            <div className="mt-2 h-2.5 w-20 rounded-full bg-slate-300" />
          </div>
        </div>
        <div className="hidden h-9 w-36 rounded-full bg-white ring-1 ring-slate-200 sm:block" />
      </div>
      <div className="mb-4 flex gap-2">
        {["الكل", "عطور", "عناية", "جديد"].map((chip) => (
          <span
            key={chip}
            className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200"
          >
            {chip}
          </span>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100"
          >
            <div
              className="h-full min-h-[4.5rem] aspect-4/5"
              style={{
                background: `linear-gradient(160deg, ${
                  [
                    "#dceee4",
                    "#e8e4dc",
                    "#d7e5ef",
                    "#efe4d8",
                    "#e2eadc",
                    "#e7e0ea",
                  ][i]
                } 0%, #fff 78%)`,
              }}
            />
            <div className="space-y-2 p-3">
              <div className="h-2.5 w-[70%] rounded-full bg-slate-200" />
              <div className="h-2.5 w-12 rounded-full bg-brand-300/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MockDashboard() {
  return (
    <div className="grid h-full grid-cols-[72px_1fr] bg-white sm:grid-cols-[120px_1fr]">
      <aside className="border-e border-slate-100 bg-slate-50/80 p-3">
        <div className="mb-6 h-7 w-14 rounded-lg bg-brand-200/80" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-8 rounded-xl ${i === 1 ? "bg-brand-100" : "bg-white/70"}`}
            />
          ))}
        </div>
      </aside>
      <div className="flex min-h-0 flex-col p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-3.5 w-32 rounded-full bg-slate-800/80" />
          <div className="h-8 w-24 rounded-full bg-brand-600" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100"
            >
              <div className="h-2.5 w-16 rounded-full bg-slate-300" />
              <div className="mt-3 h-7 w-14 rounded-lg bg-slate-800/85" />
            </div>
          ))}
        </div>
        <div className="mt-4 min-h-0 flex-1 rounded-2xl bg-gradient-to-br from-brand-50 via-white to-slate-50 ring-1 ring-slate-100" />
      </div>
    </div>
  );
}

export function MockAnalytics() {
  return (
    <div className="flex h-full flex-col bg-white p-4 sm:p-5">
      <div className="mb-4 h-3.5 w-40 rounded-full bg-slate-800/85" />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {["١٢٨", "٨٤", "٣٦", "١٩"].map((n) => (
          <div
            key={n}
            className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
          >
            <div className="h-2 w-12 rounded-full bg-slate-300" />
            <p className="mt-2 text-xl font-semibold text-slate-900">{n}</p>
          </div>
        ))}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        <svg
          viewBox="0 0 400 140"
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0 110 C 40 100, 70 40, 110 55 S 170 120, 210 90 270 30, 310 50 360 95, 400 70"
            fill="none"
            stroke="#58A379"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M0 110 C 40 100, 70 40, 110 55 S 170 120, 210 90 270 30, 310 50 360 95, 400 70 V140 H0 Z"
            fill="url(#ysChartFill)"
            opacity="0.35"
          />
          <defs>
            <linearGradient id="ysChartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#58A379" />
              <stop offset="100%" stopColor="#58A379" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

export function MockProduct() {
  return (
    <div className="grid h-full bg-white sm:grid-cols-[1.05fr_0.95fr]">
      <div className="min-h-[8rem] bg-gradient-to-br from-[#e8efe9] via-[#f4f1ea] to-white sm:min-h-0" />
      <div className="flex flex-col justify-center gap-3 p-5 sm:p-6">
        <div className="h-2.5 w-20 rounded-full bg-brand-200" />
        <div className="h-4 w-[85%] rounded-full bg-slate-800/90" />
        <div className="h-4 w-[55%] rounded-full bg-slate-800/90" />
        <div className="mt-1 h-3 w-24 rounded-full bg-brand-500/80" />
        <div className="mt-4 space-y-2">
          <div className="h-2.5 w-full rounded-full bg-slate-200" />
          <div className="h-2.5 w-[90%] rounded-full bg-slate-200" />
          <div className="h-2.5 w-[70%] rounded-full bg-slate-200" />
        </div>
        <div className="mt-4 h-11 w-full rounded-2xl bg-[#128C7E]" />
      </div>
    </div>
  );
}
