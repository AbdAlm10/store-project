import { BrandLogo } from "@/components/brand/brand-logo";
import { logoutAction } from "@/features/auth/actions";
import { getServices } from "@/infrastructure/container";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { AppError, isUnauthenticatedError } from "@/domain/errors";

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
  let adminAuth: Awaited<ReturnType<ReturnType<typeof getServices>["auth"]["requireAdmin"]>>;
  try {
    adminAuth = await getServices().auth.requireAdmin();
  } catch (error) {
    unstable_rethrow(error);
    if (isUnauthenticatedError(error)) redirect("/login");
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      redirect("/dashboard");
    }
    throw error;
  }
  if (!adminAuth.session.user.emailConfirmed) {
    redirect(`/auth/verify?email=${encodeURIComponent(adminAuth.session.user.email)}`);
  }

  return (
    <div className="min-h-dvh bg-slate-50" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/admin" className="shrink-0" aria-label="دكّان — إدارة المنصة">
            <BrandLogo variant="horizontal" className="h-8 w-auto sm:h-9" />
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 sm:px-4 sm:py-2.5 sm:text-base"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.75} />
              تسجيل الخروج
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
