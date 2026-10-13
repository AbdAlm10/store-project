"use client";

import { Button } from "@/components/ui/button";
import { Clock, Smartphone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, type SVGProps } from "react";
import styles from "./customer-view-section.module.css";

function WhatsAppLineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <path
        d="M7.6 19.6A8.2 8.2 0 1 0 5.2 16L4 20.2 7.6 19.6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M9.05 9.55c.15.4.85 1.85 2.15 2.7.95.6 1.15.55 1.4.45.35-.1 1.05-.45 1.2-.85.1-.3.1-.55.05-.65-.05-.1-.2-.15-.4-.25l-.75-.35c-.15-.08-.3-.02-.4.12l-.3.4c-.08.1-.18.12-.32.06-.4-.14-1.05-.5-1.45-1.05-.1-.14-.08-.26.02-.38l.28-.35c.12-.14.1-.28-.02-.4l-.55-.85c-.12-.2-.28-.22-.42-.22h-.32c-.15 0-.38.12-.48.38-.22.55-.08 1.15.4 1.62"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FEATURES = [
  {
    icon: Clock,
    title: "متجرك جاهز بدقائق",
    body: "اختر اسمًا، أضف صور منتجاتك وأسعارها، وشارك الرابط.",
  },
  {
    icon: WhatsAppLineIcon,
    title: "الطلبات توصلك على واتساب",
    body: "العميل يختار المنتج ويضغط زرًا واحدًا، والطلب يصلك جاهزًا.",
  },
  {
    icon: Smartphone,
    title: "شكل احترافي على الموبايل",
    body: "صور كبيرة، أسعار واضحة، وتصنيفات تسهّل التصفح.",
  },
] as const;

function LinenShirt() {
  return (
    <svg viewBox="0 0 160 180" aria-hidden className="h-[78%] w-auto">
      <path
        d="M46 34 80 52 114 34l28 22-20 24-10-8v92H48V72l-10 8L18 56Z"
        fill="#f4e7d4"
        stroke="#c9b498"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M68 46c4 10 20 10 24 0"
        fill="none"
        stroke="#c9b498"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M80 56v96" stroke="#ddcbb4" strokeWidth="1.5" />
      <circle cx="80" cy="74" r="1.6" fill="#c9b498" />
      <circle cx="80" cy="90" r="1.6" fill="#c9b498" />
      <circle cx="80" cy="106" r="1.6" fill="#c9b498" />
    </svg>
  );
}

const ORDER_MESSAGE = `مرحبًا! أود الطلب من النور:

المنتج: قميص كتان
الكمية: 1
السعر: 120,000 ل.س`;

export function CustomerViewSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const phone = phoneRef.current;
    if (!root || !phone) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = root.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.88 && rect.bottom > 80;
    if (!alreadyVisible) root.classList.add(styles["is-armed"]);

    const riseObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        root.classList.add(styles["is-in"]);
        riseObserver.disconnect();
      },
      { threshold: 0.12 },
    );
    riseObserver.observe(root);

    phone.classList.add(styles["story-armed"]);
    const storyObserver = new IntersectionObserver(
      (entries) => {
        phone.classList.toggle(
          styles["story-playing"],
          entries.some((entry) => entry.isIntersecting),
        );
      },
      { threshold: 0.35 },
    );
    storyObserver.observe(phone);

    return () => {
      riseObserver.disconnect();
      storyObserver.disconnect();
    };
  }, []);

  return (
    <section className="bg-background px-4 py-16 sm:px-6 lg:py-24" id="product">
      <div
        ref={rootRef}
        className={`${styles.rise} mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-16`}
        dir="ltr"
      >
        <div
          ref={phoneRef}
          className="relative mx-auto w-[272px] lg:mx-0 lg:w-[320px]"
        >
          <div data-rise>
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[130%] w-[150%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgb(227_210_173/0.72),transparent_68%)]"
            />
            <div className="rounded-[44px] bg-[#1c241e] p-2.5 shadow-[0_28px_60px_-36px_rgba(28,36,30,0.55)]">
              <div className="relative h-[520px] overflow-hidden rounded-[34px] bg-[#f7f4ef] lg:h-[620px]">
                <div
                  aria-hidden
                  className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1c241e]"
                />
                <div
                  data-story
                  className={`${styles["scene-catalog"]} absolute inset-0`}
                >
                  <Image
                    src="/marketing/alnoor-phone.webp"
                    alt="واجهة متجر النور على الموبايل: الشعار، البحث، تصنيفات المنتجات، وشبكة الحقائب"
                    width={780}
                    height={1688}
                    sizes="(max-width: 1024px) 272px, 320px"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div
                  aria-hidden
                  data-story
                  dir="rtl"
                  className={styles["scene-product"]}
                >
                  <div className={styles["store-bar"]}>
                    <span className={styles["store-mark"]}>ن</span>
                    <span>النور</span>
                  </div>
                  <div className={styles["shirt-stage"]}>
                    <LinenShirt />
                  </div>
                  <p className={styles["product-name"]}>قميص كتان</p>
                  <p className={styles["product-price"]}>120,000 ل.س</p>
                  <p className={styles["product-stock"]}>متوفر</p>
                  <div className={styles["order-slot"]}>
                    <div className={styles["order-button"]}>اطلب عبر واتساب</div>
                    <span data-story className={styles["scene-tap"]} />
                  </div>
                </div>
                <div aria-hidden data-story dir="rtl" className={styles["scene-chat"]}>
                  <div className={styles["wa-header"]}>
                    <span className={styles["wa-avatar"]}>ن</span>
                    <div>
                      <p className={styles["wa-name"]}>النور</p>
                      <p className={styles["wa-status"]}>متصل</p>
                    </div>
                  </div>
                  <div className={styles["wa-thread"]}>
                    <div className={styles["wa-bubble"]}>
                      {ORDER_MESSAGE}
                      <span className={styles["wa-time"]}>12:04</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            aria-hidden
            className="absolute bottom-3 left-0 right-0 z-20 mx-auto w-[232px] lg:bottom-6 lg:left-[42%] lg:right-auto lg:mx-0 lg:w-[248px]"
          >
            <div data-story className={styles["scene-bubble"]}>
              <div
                dir="rtl"
                className="animate-ys-soft-float relative rounded-[20px] bg-white px-3.5 py-3 shadow-[0_18px_44px_-22px_rgba(28,36,30,0.45)]"
              >
                <span className="absolute -top-2.5 end-3 rounded-full bg-brand-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  جديد
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                    <WhatsAppLineIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 text-start">
                    <p className="text-sm font-bold leading-snug text-foreground">
                      طلب جديد على واتساب
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      قميص كتان · 120,000 ل.س
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div dir="rtl" className="text-start">
          <p
            data-rise
            className="inline-flex rounded-full bg-[#e9f2ec] px-3.5 py-1 text-sm font-semibold text-[var(--accent-ink)]"
          >
            هكذا يرى عملاؤك متجرك
          </p>
          <h2
            data-rise
            className="mt-4 text-[2rem] font-semibold leading-tight tracking-tight text-foreground sm:text-4xl"
            style={{ ["--rise-delay" as string]: "80ms" }}
          >
            متجر أنيق على موبايل عميلك
          </h2>
          <p
            data-rise
            className="mt-3 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
            style={{ ["--rise-delay" as string]: "140ms" }}
          >
            بدون تطبيق ولا تسجيل — رابط واحد يفتح كل منتجاتك.
          </p>

          <ul className="mt-8 space-y-6">
            {FEATURES.map((feature, index) => (
              <li
                key={feature.title}
                data-rise
                className="flex items-start gap-4"
                style={{ ["--rise-delay" as string]: `${200 + index * 90}ms` }}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-[#e9f2ec] text-[var(--accent-ink)]">
                  <feature.icon className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                </span>
                <div>
                  <h3 className="text-[21px] font-semibold leading-snug text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-base leading-relaxed text-muted">
                    {feature.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div
            data-rise
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3"
            style={{ ["--rise-delay" as string]: "480ms" }}
          >
            <Link href="/register">
              <Button size="lg" className="h-12 rounded-full bg-brand-600 px-7">
                أنشئ متجرك مجانًا
              </Button>
            </Link>
            <Link
              href="/alnoor"
              className="text-base font-semibold text-[var(--accent-ink)] underline-offset-4 hover:underline"
            >
              شاهد متجرًا تجريبيًا ←
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
