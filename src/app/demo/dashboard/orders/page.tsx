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
        description="طلبات تجريبية بأسماء سورية ومحافظات، وأسعارها من منتجات النور بالليرة السورية."
      />
      <DashboardCard padding="none">
        <ul className="divide-y divide-slate-100">
          {orders.map((order) => (
            <li key={order.number} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{order.number}</p>
                <p className="text-sm text-slate-700">
                  {order.customerName}
                  <span className="text-slate-400"> · </span>
                  {order.governorate}
                </p>
                <p className="text-sm leading-snug text-slate-500">
                  {order.productName}
                  <span className="text-slate-400"> · </span>
                  {order.quantity}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900" dir="ltr">
                  {formatMoney(order.total, order.currency, locale)}
                </p>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
                  {order.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </DashboardCard>
    </div>
  );
}
