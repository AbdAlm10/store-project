export default function StoreLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-slate-100">
      <div className="h-14 border-b border-slate-200 bg-white" />
      <div className="h-52 bg-slate-200" />
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-10 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="aspect-[4/5] rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  );
}
