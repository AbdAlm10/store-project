export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-9 w-48 rounded-2xl bg-slate-100" />
          <div className="h-4 w-72 rounded-full bg-slate-100" />
        </div>
        <div className="hidden h-10 w-64 rounded-full bg-slate-100 sm:block" />
      </div>
      <div className="h-5 w-80 rounded-full bg-slate-100" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-[1.35rem] bg-[#eef6f0]" />
        ))}
      </div>
      <div className="h-40 rounded-[1.35rem] border border-slate-100 bg-white" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 rounded-[1.25rem] bg-slate-50" />
        ))}
      </div>
    </div>
  );
}
