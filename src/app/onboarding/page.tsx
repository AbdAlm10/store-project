import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Create your store",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const services = getServices();
  try {
    await services.auth.requireProfile();
  } catch {
    redirect("/login");
  }

  const stores = await services.stores.listMyStores();
  if (stores.length > 0) {
    redirect("/dashboard");
  }

  return <OnboardingWizard />;
}
