export default function DashboardLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-48 rounded-2xl bg-white/80" />
      <div className="h-4 w-72 rounded-full bg-slate-200/80" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 rounded-[1.35rem] bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.12)]"
          />
        ))}
      </div>
      <div className="h-48 rounded-[1.35rem] bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.12)]" />
    </div>
  );
}
