import { redirect, unstable_rethrow } from "next/navigation";
import { isUnauthenticatedError } from "@/domain/errors";
import { getServices } from "@/infrastructure/container";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create your store",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const services = getServices();
  let sessionEmail = "";
  let emailConfirmed = false;
  try {
    const ensured = await services.auth.ensureProfile();
    sessionEmail = ensured.session.user.email;
    emailConfirmed = ensured.session.user.emailConfirmed;
  } catch (error) {
    unstable_rethrow(error);
    if (isUnauthenticatedError(error)) redirect("/login");
    throw error;
  }
  if (!emailConfirmed) {
    redirect(`/auth/verify?email=${encodeURIComponent(sessionEmail)}`);
  }

  const stores = await services.stores.listMyStores();
  if (stores.length > 0) {
    redirect("/dashboard");
  }

  return <OnboardingWizard />;
}
