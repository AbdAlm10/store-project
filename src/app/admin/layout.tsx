import { BrandLogo } from "@/components/brand/brand-logo";
import { logoutAction } from "@/features/auth/actions";
import { getServices } from "@/infrastructure/container";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "لوحة إدارة المنصة",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await getServices().auth.requireAdmin();
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-slate-50" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="shrink-0" aria-label="دكّان — إدارة المنصة">
            <BrandLogo variant="horizontal" className="h-9 w-auto" />
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-base font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
