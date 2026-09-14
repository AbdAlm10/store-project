import { TRIAL_DAYS } from "@/config/plans";
import type {
  AnalyticsEvent,
  Category,
  Product,
  ProductImage,
  ProductVariant,
  Profile,
  Store,
  StoreMember,
  Subscription,
} from "@/domain/types/entities";

const DEMO_OWNER_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_STORE_ID = "00000000-0000-4000-8000-000000000010";
const now = new Date().toISOString();

const trialEnds = new Date();
trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);

const categories: Category[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    storeId: DEMO_STORE_ID,
    name: "Phone Cases",
    slug: "phone-cases",
    sortOrder: 0,
    imageUrl: null,
    icon: "lucide:smartphone",
    optionSchema: [
      {
        id: "opt-color",
        name: "Color",
        kind: "color",
        values: [
          { label: "Black", hex: "#111827" },
          { label: "Clear", hex: "#E2E8F0" },
          { label: "Blue", hex: "#2563EB" },
          { label: "Pink", hex: "#EC4899" },
        ],
      },
      {
        id: "opt-model",
        name: "Model",
        kind: "text",
        values: [
          { label: "iPhone 15" },
          { label: "iPhone 16" },
          { label: "Galaxy S24" },
        ],
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    storeId: DEMO_STORE_ID,
    name: "Chargers",
    slug: "chargers",
    sortOrder: 1,
    imageUrl: null,
    icon: "lucide:package",
    optionSchema: [
      {
        id: "opt-watt",
        name: "Power",
        kind: "text",
        values: [{ label: "20W" }, { label: "35W" }, { label: "65W" }],
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    storeId: DEMO_STORE_ID,
    name: "Audio",
    slug: "audio",
    sortOrder: 2,
    imageUrl: null,
    icon: "lucide:headphones",
    optionSchema: [
      {
        id: "opt-color-audio",
        name: "Color",
        kind: "color",
        values: [
          { label: "Black", hex: "#111827" },
          { label: "White", hex: "#F8FAFC" },
          { label: "Silver", hex: "#CBD5E1" },
        ],
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    storeId: DEMO_STORE_ID,
    name: "Cables",
    slug: "cables",
    sortOrder: 3,
    imageUrl: null,
    icon: "lucide:boxes",
    optionSchema: [
      {
        id: "opt-len",
        name: "Length",
        kind: "text",
        values: [{ label: "1m" }, { label: "2m" }, { label: "3m" }],
      },
    ],
    createdAt: now,
    updatedAt: now,
  },
];

function product(
  idSuffix: string,
  input: Omit<Product, "id" | "storeId" | "createdAt" | "updatedAt" | "publishedAt" | "currency" | "status"> & {
    status?: Product["status"];
  },
): Product {
  return {
    id: `00000000-0000-4000-8000-00000000${idSuffix}`,
    storeId: DEMO_STORE_ID,
    currency: "USD",
    status: input.status ?? "published",
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
    ...input,
  };
}

const products: Product[] = [
  product("0201", {
    categoryId: categories[0].id,
    name: "Clear MagSafe Case",
    slug: "clear-magsafe-case",
    description:
      "Crystal-clear protection with MagSafe alignment. Scratch-resistant edges for everyday carry.",
    price: 24,
    compareAtPrice: 32,
    stock: 40,
    tags: ["magsafe", "iphone", "clear"],
    specifications: { Material: "TPU + PC", Compatibility: "iPhone 15/16" },
    featured: true,
  }),
  product("0202", {
    categoryId: categories[0].id,
    name: "Matte Armor Case",
    slug: "matte-armor-case",
    description: "Soft-touch matte shell with raised camera rim and shock corners.",
    price: 29,
    compareAtPrice: null,
    stock: 28,
    tags: ["armor", "matte"],
    specifications: { Finish: "Matte", Drop: "2m tested" },
    featured: true,
  }),
  product("0203", {
    categoryId: categories[0].id,
    name: "Leather Wallet Case",
    slug: "leather-wallet-case",
    description: "Slim folio with two card slots and a secure magnetic closure.",
    price: 45,
    compareAtPrice: 55,
    stock: 12,
    tags: ["leather", "wallet"],
    specifications: { Slots: "2 cards", Closure: "Magnetic" },
    featured: false,
  }),
  product("0204", {
    categoryId: categories[1].id,
    name: "20W USB-C Fast Charger",
    slug: "20w-usb-c-fast-charger",
    description: "Compact GaN charger for phones and earbuds. Travel-friendly size.",
    price: 19,
    compareAtPrice: 25,
    stock: 60,
    tags: ["charger", "gan", "usb-c"],
    specifications: { Output: "20W", Port: "USB-C" },
    featured: true,
  }),
  product("0205", {
    categoryId: categories[1].id,
    name: "65W Dual-Port Charger",
    slug: "65w-dual-port-charger",
    description: "Charge laptop and phone together with intelligent power split.",
    price: 39,
    compareAtPrice: null,
    stock: 22,
    tags: ["charger", "laptop"],
    specifications: { Output: "65W", Ports: "2x USB-C" },
    featured: false,
  }),
  product("0206", {
    categoryId: categories[1].id,
    name: "Magnetic Car Charger",
    slug: "magnetic-car-charger",
    description: "Dashboard MagSafe mount with stable hold and fast charging.",
    price: 34,
    compareAtPrice: 42,
    stock: 18,
    tags: ["car", "magsafe"],
    specifications: { Mount: "Vent + dash", Output: "15W" },
    featured: false,
  }),
  product("0207", {
    categoryId: categories[2].id,
    name: "City Buds Wireless",
    slug: "city-buds-wireless",
    description: "Lightweight earbuds with clear calls and all-day battery case.",
    price: 59,
    compareAtPrice: 79,
    stock: 35,
    tags: ["earbuds", "wireless"],
    specifications: { Battery: "28h case", ANC: "No" },
    featured: true,
  }),
  product("0208", {
    categoryId: categories[2].id,
    name: "Studio Mini Speaker",
    slug: "studio-mini-speaker",
    description: "Pocket Bluetooth speaker with rich bass for desks and travel.",
    price: 49,
    compareAtPrice: null,
    stock: 15,
    tags: ["speaker", "bluetooth"],
    specifications: { Battery: "12h", Waterproof: "IPX5" },
    featured: false,
  }),
  product("0209", {
    categoryId: categories[2].id,
    name: "Over-Ear Comfort Headphones",
    slug: "over-ear-comfort-headphones",
    description: "Soft cushions, balanced sound, and a fold-flat travel design.",
    price: 89,
    compareAtPrice: 110,
    stock: 10,
    tags: ["headphones"],
    specifications: { Driver: "40mm", Cable: "Detachable" },
    featured: true,
  }),
  product("0210", {
    categoryId: categories[3].id,
    name: "Braided USB-C Cable 2m",
    slug: "braided-usb-c-cable-2m",
    description: "Durable braided cable with reinforced ends for daily charging.",
    price: 12,
    compareAtPrice: 16,
    stock: 100,
    tags: ["cable", "usb-c"],
    specifications: { Length: "2m", Rating: "60W" },
    featured: false,
  }),
  product("0211", {
    categoryId: categories[3].id,
    name: "Lightning to USB-C Cable",
    slug: "lightning-to-usb-c-cable",
    description: "MFi-style everyday cable for Apple devices.",
    price: 14,
    compareAtPrice: null,
    stock: 70,
    tags: ["cable", "lightning"],
    specifications: { Length: "1m", Rating: "20W" },
    featured: false,
  }),
  product("0212", {
    categoryId: categories[3].id,
    name: "3-in-1 Charge Cable",
    slug: "3-in-1-charge-cable",
    description: "One cable, three connectors — ready for mixed-device families.",
    price: 18,
    compareAtPrice: 22,
    stock: 45,
    tags: ["cable", "multi"],
    specifications: { Connectors: "USB-C / Lightning / Micro", Length: "1.2m" },
    featured: false,
  }),
];

const images: ProductImage[] = products.flatMap((item, index) => {
  const hue = 160 + (index % 8) * 18;
  return [
    {
      id: `00000000-0000-4000-8000-00000003${String(index).padStart(2, "0")}1`,
      productId: item.id,
      storeId: DEMO_STORE_ID,
      url: `https://placehold.co/800x800/${hue.toString(16)}647a/f8fafc/png?text=${encodeURIComponent(item.name.split(" ")[0])}`,
      alt: item.name,
      sortOrder: 0,
      width: 800,
      height: 800,
    },
  ];
});

const variants: ProductVariant[] = [
  {
    id: "00000000-0000-4000-8000-000000000301",
    productId: products[0].id,
    storeId: DEMO_STORE_ID,
    name: "Clear / iPhone 16",
    options: { Color: "Clear", Model: "iPhone 16" },
    price: 24,
    stock: 20,
    sku: "CMC-16",
  },
  {
    id: "00000000-0000-4000-8000-000000000302",
    productId: products[0].id,
    storeId: DEMO_STORE_ID,
    name: "Clear / iPhone 15",
    options: { Color: "Clear", Model: "iPhone 15" },
    price: 24,
    stock: 20,
    sku: "CMC-15",
  },
];

const events: AnalyticsEvent[] = Array.from({ length: 40 }).map((_, index) => ({
  id: `00000000-0000-4000-8000-00000004${String(index).padStart(2, "0")}`,
  storeId: DEMO_STORE_ID,
  productId: products[index % products.length].id,
  eventType:
    index % 5 === 0
      ? "whatsapp_click"
      : index % 3 === 0
        ? "store_view"
        : "product_view",
  source: index % 2 === 0 ? "instagram" : "whatsapp",
  path: `/${demoSlug()}`,
  visitorKey: `visitor-${index % 12}`,
  metadata: {},
  createdAt: new Date(Date.now() - index * 3600_000).toISOString(),
}));

function demoSlug() {
  return "alnoor";
}

export const demoSeed = {
  profiles: [
    {
      id: DEMO_OWNER_ID,
      email: "merchant@alnoor.demo",
      fullName: "Al Noor Merchant",
      avatarUrl: null,
      platformRole: "merchant",
      locale: "ar",
      createdAt: now,
      updatedAt: now,
      suspendedAt: null,
    } satisfies Profile,
    {
      id: "00000000-0000-4000-8000-000000000099",
      email: "admin@yourstore.app",
      fullName: "Platform Admin",
      avatarUrl: null,
      platformRole: "admin",
      locale: "ar",
      createdAt: now,
      updatedAt: now,
      suspendedAt: null,
    } satisfies Profile,
  ],
  stores: [
    {
      id: DEMO_STORE_ID,
      ownerId: DEMO_OWNER_ID,
      name: "Al Noor Store",
      slug: "alnoor",
      description:
        "Mobile accessories for everyday life — cases, chargers, audio, and cables. Order via WhatsApp in one tap.",
      logoUrl: "https://placehold.co/160x160/0f766e/ecfdf5/png?text=AN",
      coverUrl: "https://placehold.co/1600x600/0f172a/e2e8f0/png?text=Al+Noor+Store",
      status: "published",
      currency: "USD",
      phone: "+1 555 0100",
      whatsapp: "+15550100",
      email: "hello@alnoor.demo",
      location: "Downtown Market, Stall 12",
      openingHours: "Sat–Thu 10:00–20:00",
      instagram: "https://instagram.com/alnoor",
      facebook: "https://facebook.com/alnoor",
      telegram: "https://t.me/alnoor",
      tiktok: null,
      primaryColor: "#58A379",
      themeId: "clean",
      themeOverrides: null,
      defaultLocale: "ar",
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
      suspendedAt: null,
    } satisfies Store,
  ],
  members: [
    {
      id: "00000000-0000-4000-8000-000000000011",
      storeId: DEMO_STORE_ID,
      userId: DEMO_OWNER_ID,
      role: "owner",
      createdAt: now,
    } satisfies StoreMember,
  ],
  categories,
  products,
  images,
  variants,
  subscriptions: [
    {
      id: "00000000-0000-4000-8000-000000000012",
      storeId: DEMO_STORE_ID,
      planId: "pro",
      status: "active",
      trialEndsAt: null,
      currentPeriodEnd: trialEnds.toISOString(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: now,
      updatedAt: now,
    } satisfies Subscription,
  ],
  events,
  ids: {
    ownerId: DEMO_OWNER_ID,
    storeId: DEMO_STORE_ID,
  },
};
