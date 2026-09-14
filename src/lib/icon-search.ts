import type { LucideIcon } from "lucide-react";
import {
  Shirt,
  ShoppingBag,
  Footprints,
  Watch,
  Glasses,
  Gem,
  Smartphone,
  Laptop,
  Headphones,
  Camera,
  Gamepad2,
  Home,
  Sofa,
  Lamp,
  UtensilsCrossed,
  Coffee,
  Pizza,
  IceCream,
  Baby,
  ToyBrick,
  Dumbbell,
  Bike,
  BookOpen,
  Gift,
  Sparkles,
  SprayCan,
  Heart,
  Car,
  Wrench,
  PawPrint,
  Leaf,
  Flower2,
  Music,
  Palette,
  Scissors,
  Brush,
  Package,
  Boxes,
  Tag,
  Store,
  CookingPot,
  Microwave,
  Refrigerator,
  BedDouble,
  Bath,
} from "lucide-react";

export type CategoryIconEntry = {
  /** Stored id: `lucide:shirt` */
  id: string;
  Icon: LucideIcon;
  /** Search keywords in Arabic, English, Turkish */
  keywords: string[];
};

/** Reliable local catalog — no CDN, Arabic searchable. */
export const LUCIDE_CATEGORY_ICONS: CategoryIconEntry[] = [
  { id: "lucide:shirt", Icon: Shirt, keywords: ["clothes", "shirt", "fashion", "ملابس", "لبس", "قميص", "أزياء", "ازياء", "giyim"] },
  { id: "lucide:shopping-bag", Icon: ShoppingBag, keywords: ["bag", "shopping", "حقيبة", "حقائب", "شنطة", "شنط", "çanta"] },
  { id: "lucide:footprints", Icon: Footprints, keywords: ["shoes", "footwear", "أحذية", "احذية", "شوز", "حذاء", "ayakkabi", "ayakkabı"] },
  { id: "lucide:watch", Icon: Watch, keywords: ["watch", "clock", "ساعة", "ساعات", "saat"] },
  { id: "lucide:glasses", Icon: Glasses, keywords: ["glasses", "eyewear", "نظارات", "نظارة"] },
  { id: "lucide:gem", Icon: Gem, keywords: ["jewelry", "jewellery", "مجوهرات", "ذهب", "فضة", "خاتم"] },
  { id: "lucide:smartphone", Icon: Smartphone, keywords: ["phone", "mobile", "جوال", "جوالات", "هاتف", "هواتف", "موبايل", "كفرات", "telefon"] },
  { id: "lucide:laptop", Icon: Laptop, keywords: ["laptop", "computer", "لابتوب", "كمبيوتر", "حاسوب", "الكترونيات", "إلكترونيات", "elektronik"] },
  { id: "lucide:headphones", Icon: Headphones, keywords: ["headphones", "audio", "سماعة", "سماعات", "صوتيات", "موسيقى"] },
  { id: "lucide:camera", Icon: Camera, keywords: ["camera", "photo", "كاميرا", "تصوير"] },
  { id: "lucide:gamepad-2", Icon: Gamepad2, keywords: ["games", "gaming", "ألعاب", "العاب", "بلايستيشن"] },
  { id: "lucide:home", Icon: Home, keywords: ["home", "house", "منزل", "بيت", "دار", "ev"] },
  { id: "lucide:sofa", Icon: Sofa, keywords: ["furniture", "sofa", "أثاث", "اثاث", "كنب", "مفروشات"] },
  { id: "lucide:lamp", Icon: Lamp, keywords: ["lamp", "light", "إضاءة", "اضاءة", "مصباح"] },
  { id: "lucide:utensils-crossed", Icon: UtensilsCrossed, keywords: ["food", "restaurant", "طعام", "مأكولات", "ماكولات", "مطعم", "yiyecek"] },
  { id: "lucide:coffee", Icon: Coffee, keywords: ["coffee", "drink", "قهوة", "مشروبات", "شاي"] },
  { id: "lucide:pizza", Icon: Pizza, keywords: ["pizza", "fast food", "بيتزا"] },
  { id: "lucide:ice-cream", Icon: IceCream, keywords: ["dessert", "ice cream", "حلويات", "آيسكريم"] },
  { id: "lucide:baby", Icon: Baby, keywords: ["baby", "kids", "أطفال", "اطفال", "رضع", "bebek"] },
  { id: "lucide:toy-brick", Icon: ToyBrick, keywords: ["toys", "kids", "ألعاب أطفال", "لعبة"] },
  { id: "lucide:dumbbell", Icon: Dumbbell, keywords: ["sports", "gym", "رياضة", "لياقة", "spor"] },
  { id: "lucide:bike", Icon: Bike, keywords: ["bike", "cycling", "دراجة", "دراجات"] },
  { id: "lucide:book-open", Icon: BookOpen, keywords: ["books", "book", "كتب", "كتاب", "قرطاسية"] },
  { id: "lucide:gift", Icon: Gift, keywords: ["gift", "presents", "هدايا", "هدية"] },
  { id: "lucide:sparkles", Icon: Sparkles, keywords: ["beauty", "makeup", "تجميل", "مكياج", "جمال"] },
  { id: "lucide:spray-can", Icon: SprayCan, keywords: ["perfume", "fragrance", "عطور", "عطر"] },
  { id: "lucide:heart", Icon: Heart, keywords: ["care", "skincare", "عناية", "بشرة"] },
  { id: "lucide:car", Icon: Car, keywords: ["car", "auto", "سيارات", "سيارة", "قطع غيار"] },
  { id: "lucide:wrench", Icon: Wrench, keywords: ["tools", "hardware", "أدوات", "ادوات", "عدة"] },
  { id: "lucide:paw-print", Icon: PawPrint, keywords: ["pets", "animals", "حيوانات", "حيوانات أليفة", "قطط", "كلاب"] },
  { id: "lucide:leaf", Icon: Leaf, keywords: ["plants", "nature", "نباتات", "زرع"] },
  { id: "lucide:flower-2", Icon: Flower2, keywords: ["flowers", "ورد", "زهور"] },
  { id: "lucide:music", Icon: Music, keywords: ["music", "موسيقى"] },
  { id: "lucide:palette", Icon: Palette, keywords: ["art", "craft", "فنون", "رسم"] },
  { id: "lucide:scissors", Icon: Scissors, keywords: ["salon", "hair", "حلاقة", "صالون"] },
  { id: "lucide:brush", Icon: Brush, keywords: ["brush", "paint", "فرشاة"] },
  { id: "lucide:package", Icon: Package, keywords: ["package", "box", "طرود", "تغليف"] },
  { id: "lucide:boxes", Icon: Boxes, keywords: ["inventory", "stock", "مخزون", "صناديق"] },
  { id: "lucide:tag", Icon: Tag, keywords: ["sale", "offers", "عروض", "تخفيضات"] },
  { id: "lucide:store", Icon: Store, keywords: ["store", "shop", "متجر", "دكان"] },
  { id: "lucide:cooking-pot", Icon: CookingPot, keywords: ["kitchen", "cookware", "مطبخ", "أواني"] },
  { id: "lucide:microwave", Icon: Microwave, keywords: ["appliance", "microwave", "أجهزة", "اجهزة"] },
  { id: "lucide:refrigerator", Icon: Refrigerator, keywords: ["fridge", "appliance", "ثلاجة"] },
  { id: "lucide:bed-double", Icon: BedDouble, keywords: ["bedroom", "bed", "غرف نوم", "سرير"] },
  { id: "lucide:bath", Icon: Bath, keywords: ["bathroom", "bath", "حمام"] },
];

export function normalizeSearchText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\s+/g, " ");
}

/** Extra Arabic → English phrases for Iconify fallback. */
const PHRASE_SYNONYMS: Array<[string, string]> = [
  ["ملابس", "clothes"],
  ["لبس", "clothes"],
  ["ازياء", "fashion"],
  ["احذيه", "shoes"],
  ["احذية", "shoes"],
  ["حذاء", "shoes"],
  ["حقائب", "bag"],
  ["شنط", "bag"],
  ["اكسسوارات", "accessories"],
  ["الكترونيات", "electronics"],
  ["جوالات", "phone"],
  ["هواتف", "phone"],
  ["كفرات", "phone case"],
  ["طعام", "food"],
  ["ماكولات", "food"],
  ["مشروبات", "drink"],
  ["منزل", "home"],
  ["اثاث", "furniture"],
  ["تجميل", "beauty"],
  ["عنايه", "skincare"],
  ["عناية", "skincare"],
  ["عطور", "perfume"],
  ["اطفال", "kids"],
  ["العاب", "toys"],
  ["رياضه", "sports"],
  ["رياضة", "sports"],
  ["كتب", "book"],
  ["هدايا", "gift"],
  ["ساعات", "watch"],
  ["نظارات", "glasses"],
  ["مجوهرات", "jewelry"],
  ["حيوانات", "pet"],
  ["سيارات", "car"],
  ["ادوات", "tools"],
  ["مطبخ", "kitchen"],
];

export function translateIconQuery(raw: string): string {
  const q = normalizeSearchText(raw);
  if (!q) return q;
  for (const [ar, en] of PHRASE_SYNONYMS) {
    if (q === normalizeSearchText(ar) || q.includes(normalizeSearchText(ar))) {
      return en;
    }
  }
  return raw.trim();
}

export function searchLucideIcons(raw: string, limit = 48): CategoryIconEntry[] {
  const q = normalizeSearchText(raw);
  if (!q) return LUCIDE_CATEGORY_ICONS.slice(0, Math.min(24, limit));
  const scored = LUCIDE_CATEGORY_ICONS.map((entry) => {
    let score = 0;
    for (const keyword of entry.keywords) {
      const k = normalizeSearchText(keyword);
      if (k === q) score = Math.max(score, 100);
      else if (k.startsWith(q) || q.startsWith(k)) score = Math.max(score, 80);
      else if (k.includes(q) || q.includes(k)) score = Math.max(score, 60);
    }
    const idPart = entry.id.replace("lucide:", "");
    if (idPart.includes(q)) score = Math.max(score, 50);
    return { entry, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((item) => item.entry);
}

export function getLucideIconEntry(id: string): CategoryIconEntry | null {
  return LUCIDE_CATEGORY_ICONS.find((item) => item.id === id) ?? null;
}

/** Same-origin SVG proxy URL (avoids broken CDN / blocked regions). */
export function iconSvgSrc(iconId: string): string {
  if (iconId.startsWith("lucide:")) return "";
  return `/api/icons/svg?id=${encodeURIComponent(iconId)}`;
}

/** @deprecated use iconSvgSrc */
export function iconifySvgUrl(iconId: string, _color = "1c241e"): string {
  return iconSvgSrc(iconId);
}

export const ICONIFY_ALLOWED_PREFIXES = new Set([
  "mdi",
  "tabler",
  "ph",
  "heroicons",
  "material-symbols",
  "lucide",
  "bi",
  "ri",
]);
