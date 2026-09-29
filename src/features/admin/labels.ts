import type { PlanId } from "@/config/plans";
import { PLANS } from "@/config/plans";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";
import type { Subscription } from "@/domain/types/entities";
import type { PlatformRole, StoreStatus, SubscriptionStatus } from "@/domain/types/enums";

export const PLAN_LABEL_AR: Record<PlanId, string> = {
  trial: "تجربة مجانية",
  basic: "أساسي",
  pro: "برو",
};

export const STORE_STATUS_AR: Record<StoreStatus, string> = {
  draft: "مسودة",
  published: "منشور",
  suspended: "موقوف",
  restricted: "مقيّد",
};

export const SUBSCRIPTION_STATUS_AR: Record<SubscriptionStatus, string> = {
  trialing: "فترة تجريبية",
  active: "نشط",
  past_due: "متأخر الدفع",
  canceled: "ملغى",
  expired: "منتهٍ",
  restricted: "مقيّد",
};

export const PLATFORM_ROLE_AR: Record<PlatformRole, string> = {
  visitor: "زائر",
  merchant: "تاجر",
  admin: "مدير",
};

export function subscriptionPeriodEnd(sub: Subscription): string | null {
  if (sub.status === "trialing" || sub.planId === "trial") {
    return sub.trialEndsAt;
  }
  return sub.currentPeriodEnd;
}

export function remainingDays(endAt: string | null): number | null {
  if (!endAt) return null;
  const ends = Date.parse(endAt);
  if (!Number.isFinite(ends)) return null;
  return Math.max(0, Math.ceil((ends - Date.now()) / 86_400_000));
}

export function formatDateAr(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("ar", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** وصف عربي كامل لحالة الاشتراك */
export function subscriptionStateSummaryAr(sub: Subscription): string {
  const plan = PLAN_LABEL_AR[sub.planId] ?? PLANS[sub.planId].name;
  const status = SUBSCRIPTION_STATUS_AR[sub.status] ?? sub.status;
  const usable = isSubscriptionUsable(sub);
  const endAt = subscriptionPeriodEnd(sub);
  const days = remainingDays(endAt);

  if (!usable) {
    return `الخطة: ${plan} · الحالة: ${status} · غير فعّال`;
  }
  if (days === null) {
    return `الخطة: ${plan} · الحالة: ${status} · بدون تاريخ انتهاء`;
  }
  if (days === 0) {
    return `الخطة: ${plan} · الحالة: ${status} · ينتهي اليوم`;
  }
  return `الخطة: ${plan} · الحالة: ${status} · ${days} يوم متبقٍ`;
}
