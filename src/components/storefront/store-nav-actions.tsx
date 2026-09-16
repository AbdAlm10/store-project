"use client";

import type { Store } from "@/domain/types/entities";
import { useI18n } from "@/i18n/provider";
import { trackAnalyticsEvent } from "@/lib/analytics/client-track";
import {
  NAVBAR_ACTION_LABEL_KEY,
  hrefForNavbarAction,
  type NavbarActionId,
} from "@/lib/navbar-actions";
import {
  Facebook,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  type LucideIcon,
} from "lucide-react";

const NAV_ICONS: Record<NavbarActionId, LucideIcon> = {
  whatsapp: MessageCircle,
  phone: Phone,
  instagram: Instagram,
  facebook: Facebook,
  telegram: Send,
  location: MapPin,
};

export function StoreNavActions({
  store,
  actions,
}: {
  store: Store;
  actions: NavbarActionId[];
}) {
  const { t } = useI18n();

  if (actions.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {actions.map((id) => {
        const href = hrefForNavbarAction(store, id);
        if (!href) return null;
        const Icon = NAV_ICONS[id];
        const label = t(NAVBAR_ACTION_LABEL_KEY[id]);
        const external = id !== "phone";

        return (
          <a
            key={id}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            aria-label={label}
            title={label}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition hover:scale-105 active:scale-95 sm:h-10 sm:w-10"
            style={{
              backgroundColor: "var(--store-accent)",
              color: "var(--store-button-text)",
              boxShadow:
                "0 8px 22px -12px color-mix(in srgb, var(--store-accent) 75%, transparent)",
            }}
            onClick={() => {
              if (id === "whatsapp") {
                trackAnalyticsEvent({
                  storeId: store.id,
                  eventType: "whatsapp_click",
                  path: `/${store.slug}`,
                  source: "navbar",
                });
              }
            }}
          >
            <Icon
              className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]"
              strokeWidth={2}
            />
          </a>
        );
      })}
    </div>
  );
}
