export default function ProductsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-9 w-40 rounded-2xl bg-slate-100" />
          <div className="h-4 w-72 rounded-full bg-slate-100" />
        </div>
        <div className="h-11 w-32 rounded-xl bg-brand-100" />
      </div>

      <div className="rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="h-11 flex-1 rounded-xl bg-slate-100" />
          <div className="h-11 w-full rounded-xl bg-slate-100 sm:w-44" />
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-[1.35rem] border border-slate-100 bg-white shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] md:block">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <div className="flex gap-8">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-3 w-16 rounded-full bg-slate-100" />
            ))}
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-slate-50 px-5 py-3.5 last:border-0"
          >
            <div className="h-11 w-11 rounded-xl bg-slate-100" />
            <div className="h-3 w-36 rounded-full bg-slate-100" />
            <div className="ms-auto h-3 w-16 rounded-full bg-slate-100" />
            <div className="h-3 w-10 rounded-full bg-slate-100" />
            <div className="h-6 w-16 rounded-full bg-slate-100" />
            <div className="flex gap-1.5">
              <div className="h-8 w-16 rounded-full bg-slate-100" />
              <div className="h-8 w-16 rounded-full bg-slate-100" />
              <div className="h-8 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.35rem] border border-slate-100 bg-white p-4 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)]"
          >
            <div className="flex gap-3">
              <div className="h-16 w-16 rounded-2xl bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded-full bg-slate-100" />
                <div className="h-3 w-1/3 rounded-full bg-slate-100" />
                <div className="h-5 w-16 rounded-full bg-slate-100" />
              </div>
            </div>
            <div className="mt-3 flex gap-1.5">
              <div className="h-8 w-16 rounded-full bg-slate-100" />
              <div className="h-8 w-16 rounded-full bg-slate-100" />
              <div className="h-8 w-16 rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
