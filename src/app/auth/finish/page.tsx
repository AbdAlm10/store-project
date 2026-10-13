import { redirect, unstable_rethrow } from "next/navigation";
import { getServices } from "@/infrastructure/container";

export const dynamic = "force-dynamic";

/**
 * Runs after /auth/callback sets session cookies on the response.
 * Profile/store setup must happen on this follow-up request — not in the callback route.
 */
export default async function AuthFinishPage() {
  const services = getServices();
  try {
    await services.auth.ensureProfile();
    const stores = await services.stores.listMyStores();
    redirect(stores.length > 0 ? "/dashboard" : "/onboarding");
  } catch (error) {
    // redirect() throws. Swallowing it used to send every success to /login.
    unstable_rethrow(error);
    redirect("/login?error=oauth");
  }
}
