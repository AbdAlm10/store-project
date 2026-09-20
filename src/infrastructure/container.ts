import { AuthService } from "@/application/services/auth-service";
import { StoreService } from "@/application/services/store-service";
import { ProductService } from "@/application/services/product-service";
import { CategoryService } from "@/application/services/category-service";
import { AnalyticsService } from "@/application/services/analytics-service";
import { MediaService } from "@/application/services/media-service";
import { EntitlementService } from "@/application/services/entitlement-service";
import {
  MemoryAnalyticsRepository,
  MemoryCategoryRepository,
  MemoryProductRepository,
  MemoryStoreMemberRepository,
  MemoryStoreRepository,
  MemorySubscriptionRepository,
  MemoryUserRepository,
} from "@/infrastructure/memory/repositories";
import {
  MemoryAuthProvider,
  MemoryStorageProvider,
  NoopEmailProvider,
  StubPaymentProvider,
} from "@/infrastructure/memory/providers";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { SupabaseAuthProvider } from "@/infrastructure/supabase/auth";
import { SupabaseStorageProvider } from "@/infrastructure/supabase/storage";
import {
  SupabaseAnalyticsRepository,
  SupabaseCategoryRepository,
  SupabaseProductRepository,
  SupabaseStoreMemberRepository,
  SupabaseStoreRepository,
  SupabaseSubscriptionRepository,
  SupabaseUserRepository,
} from "@/infrastructure/supabase/repositories";

export type AppServices = {
  auth: AuthService;
  stores: StoreService;
  products: ProductService;
  categories: CategoryService;
  analytics: AnalyticsService;
  media: MediaService;
  entitlements: EntitlementService;
  payments: StubPaymentProvider;
  email: NoopEmailProvider;
  mode: "memory" | "supabase";
};

/**
 * Composition root. Uses Supabase when env is configured; otherwise memory/demo.
 */
export function createServices(): AppServices {
  const useSupabase = isSupabaseConfigured();

  const users = useSupabase
    ? new SupabaseUserRepository()
    : new MemoryUserRepository();
  const stores = useSupabase
    ? new SupabaseStoreRepository()
    : new MemoryStoreRepository();
  const members = useSupabase
    ? new SupabaseStoreMemberRepository()
    : new MemoryStoreMemberRepository();
  const categories = useSupabase
    ? new SupabaseCategoryRepository()
    : new MemoryCategoryRepository();
  const products = useSupabase
    ? new SupabaseProductRepository()
    : new MemoryProductRepository();
  const subscriptions = useSupabase
    ? new SupabaseSubscriptionRepository()
    : new MemorySubscriptionRepository();
  const analytics = useSupabase
    ? new SupabaseAnalyticsRepository()
    : new MemoryAnalyticsRepository();

  const authProvider = useSupabase
    ? new SupabaseAuthProvider()
    : new MemoryAuthProvider();
  const storage = useSupabase
    ? new SupabaseStorageProvider()
    : new MemoryStorageProvider();
  const payments = new StubPaymentProvider();
  const email = new NoopEmailProvider();

  const auth = new AuthService(authProvider, users);
  const entitlements = new EntitlementService(subscriptions);
  const storeService = new StoreService(
    auth,
    stores,
    members,
    subscriptions,
    entitlements,
  );
  const productService = new ProductService(
    auth,
    stores,
    members,
    products,
    entitlements,
  );
  const categoryService = new CategoryService(
    auth,
    stores,
    members,
    categories,
    entitlements,
  );
  const analyticsService = new AnalyticsService(
    auth,
    stores,
    members,
    analytics,
    entitlements,
    products,
  );
  const media = new MediaService(auth, stores, members, storage, entitlements);

  return {
    auth,
    stores: storeService,
    products: productService,
    categories: categoryService,
    analytics: analyticsService,
    media,
    entitlements,
    payments,
    email,
    mode: useSupabase ? "supabase" : "memory",
  };
}

/** Changes every time this module is re-evaluated (HMR-safe). */
const SERVICES_BOOT_ID =
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const globalForServices = globalThis as unknown as {
  __yourstoreServices?: AppServices;
  __yourstoreMode?: string;
  __yourstoreServicesBootId?: string;
};

function entitlementsApiReady(services: AppServices): boolean {
  const e = services.entitlements as EntitlementService & Record<string, unknown>;
  return (
    typeof e.canCustomizeAllThemeColors === "function" &&
    typeof e.getLimits === "function" &&
    typeof e.maxNavActions === "function" &&
    typeof e.assertCanCreateCategory === "function"
  );
}

export function getServices(): AppServices {
  const mode = isSupabaseConfigured() ? "supabase" : "memory";
  const existing = globalForServices.__yourstoreServices;
  const stale =
    !existing ||
    globalForServices.__yourstoreMode !== mode ||
    globalForServices.__yourstoreServicesBootId !== SERVICES_BOOT_ID ||
    !entitlementsApiReady(existing);

  if (stale) {
    globalForServices.__yourstoreServices = createServices();
    globalForServices.__yourstoreMode = mode;
    globalForServices.__yourstoreServicesBootId = SERVICES_BOOT_ID;
  }
  return globalForServices.__yourstoreServices!;
}
