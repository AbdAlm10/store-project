export default function DashboardLoading() {
  return (
    <div className="space-y-4 animate-pulse p-1">
      <div className="h-8 w-48 rounded-xl bg-slate-200" />
      <div className="h-4 w-72 rounded bg-slate-100" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl bg-white ring-1 ring-slate-200" />
        ))}
      </div>
    </div>
  );
}
