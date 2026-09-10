import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { demoSeed } from "@/infrastructure/demo/seed";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const services = getServices();
  let profile;
  try {
    ({ profile } = await services.auth.requireAdmin());
  } catch {
    // Demo shortcut: allow viewing foundation with admin seed identity note
    redirect("/login");
  }

  const stores = demoSeed.stores;
  const products = demoSeed.products;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-slate-900">
          Admin
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Signed in as {profile.email}. Platform foundation — suspend/report
          workflows can extend from here.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Users (seed)" value={demoSeed.profiles.length} />
        <Stat label="Stores" value={stores.length} />
        <Stat label="Products" value={products.length} />
      </div>
      <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <h2 className="font-semibold text-slate-900">Stores</h2>
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {stores.map((store) => (
            <li key={store.id} className="flex justify-between py-3">
              <span>
                {store.name}{" "}
                <span className="text-slate-500">/{store.slug}</span>
              </span>
              <span className="capitalize text-slate-600">{store.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl">
        {value}
      </p>
    </div>
  );
}
