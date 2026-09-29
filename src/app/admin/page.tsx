import { AdminDashboard } from "@/components/admin/admin-dashboard";
import type { AdminOverview } from "@/application/services/admin-platform-service";
import { AppError } from "@/domain/errors";
import { getServices } from "@/infrastructure/container";
import { isSupabaseServiceRoleConfigured } from "@/infrastructure/supabase/config";

export const dynamic = "force-dynamic";

const EMPTY_OVERVIEW: AdminOverview = {
  users: [],
  stores: [],
  stats: {
    userCount: 0,
    storeCount: 0,
    activeSubscriptions: 0,
    suspendedUsers: 0,
    suspendedStores: 0,
  },
};

export default async function AdminPage() {
  const services = getServices();
  await services.auth.requireAdmin();
  const mode = services.mode;
  const serviceRoleConfigured = isSupabaseServiceRoleConfigured();

  let overview = EMPTY_OVERVIEW;
  let loadError: string | null = null;

  if (mode === "memory" || serviceRoleConfigured) {
    try {
      overview = await services.admin.getOverview();
    } catch (error) {
      loadError =
        error instanceof AppError
          ? error.message
          : "تعذّر تحميل بيانات المنصة.";
    }
  } else {
    loadError =
      "أضف SUPABASE_SERVICE_ROLE_KEY في بيئة الخادم لعرض المتاجر.";
  }

  return (
    <>
      {loadError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      ) : null}

      <AdminDashboard
        overview={overview}
        mode={mode}
        serviceRoleConfigured={serviceRoleConfigured}
      />
    </>
  );
}
