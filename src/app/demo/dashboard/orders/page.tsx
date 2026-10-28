import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { demoOrders } from "@/features/demo/catalog";
import { formatMoney } from "@/lib/social/sharing";
import { getRequestLocale } from "@/i18n/get-locale";

export const metadata = {
  title: "الطلبات",
  robots: { index: false, follow: false },
};

export default async function DemoOrdersPage() {
  const locale = await getRequestLocale();
  const orders = demoOrders();
  return (
    <div className="space-y-6">
      <PageHeader
        title="الطلبات"
        description="طلبات تجريبية مبنية على منتجات متجر النور وأسعارها في البيانات التجريبية."
      />
      <DashboardCard padding="none">
        <ul className="divide-y divide-slate-100">
          {orders.map((order) => (
            <li key={order.number} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{order.number}</p>
                <p className="truncate text-sm text-slate-500">
                  {order.productName} · {order.quantity}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900" dir="ltr">
                {formatMoney(order.total, order.currency, locale)}
              </p>
              <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
                {order.status}
              </span>
            </li>
          ))}
        </ul>
      </DashboardCard>
    </div>
  );
}
