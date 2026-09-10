export default function ProductLoading() {
  return (
    <div className="min-h-screen animate-pulse bg-slate-100">
      <div className="h-14 border-b border-slate-200 bg-white" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-2">
        <div className="aspect-square rounded-3xl bg-white" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 rounded bg-white" />
          <div className="h-4 w-full rounded bg-white" />
          <div className="h-4 w-5/6 rounded bg-white" />
          <div className="h-12 w-40 rounded-xl bg-white" />
        </div>
      </div>
    </div>
  );
}
