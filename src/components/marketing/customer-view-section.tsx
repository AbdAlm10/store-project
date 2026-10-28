"use client";

import Link from "next/link";
import { useEffect, useRef, type SVGProps } from "react";
import styles from "./customer-view-section.module.css";

const STORY: Array<[string, number]> = [
  ["1", 2600],
  ["2", 1300],
  ["3", 2800],
  ["4", 3600],
];

function Icon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" aria-hidden {...props} />;
}

function Photo({
  name,
  width,
  alt,
  sizes,
}: {
  name: "shirt-linen" | "bag-leather" | "sunglasses" | "tee-cotton";
  width: number;
  alt: string;
  sizes: string;
}) {
  return (
    <img
      src={`/marketing/${name}.webp`}
      srcSet={`/marketing/${name}-sm.webp 240w, /marketing/${name}.webp ${width}w`}
      sizes={sizes}
      alt={alt}
      width={width}
      height={width === 440 ? 440 : width}
      loading="lazy"
      decoding="async"
    />
  );
}

export function CustomerViewSection() {
  const storyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = storyRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.step = "4";
      return;
    }

    let index = 0;
    let timer = 0;
    let running = false;

    const arm = () => {
      const [step, delay] = STORY[index];
      el.dataset.step = step;
      timer = window.setTimeout(() => {
        index = (index + 1) % STORY.length;
        if (running) arm();
      }, delay);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !running) {
          running = true;
          arm();
        } else if (entry && !entry.isIntersecting && running) {
          running = false;
          window.clearTimeout(timer);
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      running = false;
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <section className={styles.sp} id="product" aria-labelledby="showcase-title">
      <div className={styles.copy}>
        <span className={styles.eyebrow}>
          <i />
          هكذا يرى زبونك متجرك
        </span>
        <h2 id="showcase-title">
          متجر أنيق على هاتف زبونك، <em>والطلب يصلك على واتساب</em>
        </h2>
        <p className={styles.lead}>
          أضف منتجاتك بصورها وأسعارها بالليرة السورية، وشارك رابط متجرك. يختار الزبون ما يريد ويرسل طلبه برسالة واحدة جاهزة.
        </p>
        <ul className={styles.benefits}>
          <li>
            <span className={styles.ico}>
              <Icon>
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-4.5-4.5L7 20" />
              </Icon>
            </span>
            <div>
              <b>صفحة لكل منتج</b>
              <span>صور واضحة، وصف مختصر، مقاسات وسعر — كل ما يحتاجه الزبون ليقرّر.</span>
            </div>
          </li>
          <li>
            <span className={styles.ico}>
              <Icon>
                <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z" />
                <path d="M9 10.5h6M9 13.5h4" />
              </Icon>
            </span>
            <div>
              <b>الطلب يصلك مرتّباً</b>
              <span>اسم المنتج والمقاس والكمية والمجموع في رسالة واتساب واحدة.</span>
            </div>
          </li>
          <li>
            <span className={styles.ico}>
              <Icon>
                <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
              </Icon>
            </span>
            <div>
              <b>رابط واحد تشاركه</b>
              <span>في الحالة، على إنستغرام، أو في مجموعات الحي — متجرك يعمل طوال اليوم.</span>
            </div>
          </li>
        </ul>
        <div className={styles.ctas}>
          <Link href="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
            أنشئ متجرك
            <Icon>
              <path d="M15 6l-6 6 6 6" />
            </Icon>
          </Link>
          <Link href="/alnoor" className={`${styles.btn} ${styles.btnSecondary}`}>
            شاهد متجراً تجريبياً
          </Link>
          <Link href="/demo/dashboard" className={`${styles.btn} ${styles.btnSecondary}`}>
            شوف لوحة التحكم
          </Link>
        </div>
      </div>

      <div className={styles.stage}>
        <div className={styles.deviceFit}>
          <div className={styles.device} ref={storyRef} data-step="1">
            <div
              className={styles.phone}
              role="img"
              aria-label="مثال: زبون يطلب قميصاً من متجر النور عبر واتساب"
            >
              <div className={styles.screen}>
                <div className={styles.island} />
                <div className={styles.status}>
                  <span>٩:٤١</span>
                  <span className={styles.sig}>
                    <s />
                    <i />
                  </span>
                </div>

                <div className={`${styles.view} ${styles.vStore}`}>
                  <div className={styles.appbar}>
                    <span className={styles.logo}>ن</span>
                    <div className={styles.nm}>
                      <b>متجر النور</b>
                      <span>ألبسة وإكسسوارات · دمشق</span>
                    </div>
                    <span className={styles.ib}>
                      <Icon>
                        <circle cx="11" cy="11" r="6.5" />
                        <path d="m20 20-4.2-4.2" />
                      </Icon>
                    </span>
                    <span className={styles.ib}>
                      <Icon>
                        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
                      </Icon>
                    </span>
                  </div>
                  <div className={styles.chips}>
                    <span className={`${styles.chip} ${styles.chipOn}`}>الكل</span>
                    <span className={styles.chip}>قمصان</span>
                    <span className={styles.chip}>حقائب</span>
                    <span className={styles.chip}>إكسسوارات</span>
                  </div>
                  <div className={styles.pcard}>
                    <div className={styles.pimg}>
                      <Photo
                        name="shirt-linen"
                        width={440}
                        alt="قميص كتان رجالي أبيض"
                        sizes="(max-width: 900px) 200px, 250px"
                      />
                      <span className={styles.tag}>وصل حديثاً</span>
                    </div>
                    <div className={styles.pinfo}>
                      <h3>قميص كتان رجالي أبيض</h3>
                      <p>كتان طبيعي خفيف، مثالي لصيف دمشق.</p>
                      <div className={styles.prow}>
                        <span className={styles.price}>
                          120,000<small>ل.س</small>
                        </span>
                        <span className={styles.sizes}>
                          <i>٤٠</i>
                          <i className={styles.on}>٤٢</i>
                          <i>٤٤</i>
                        </span>
                      </div>
                      <div className={styles.wa}>
                        <span className={styles.rip} />
                        <Icon>
                          <path d="M12 2.2A9.7 9.7 0 0 0 3.6 16.8L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.2Z" />
                        </Icon>
                        اطلب عبر واتساب
                      </div>
                    </div>
                  </div>
                  <div className={styles.more}>
                    <h4>
                      قد يعجبك أيضاً <span>عرض الكل</span>
                    </h4>
                    <div className={styles.minis}>
                      <div className={styles.mini}>
                        <Photo name="bag-leather" width={480} alt="" sizes="72px" />
                        <b>حقيبة جلدية</b>
                        <span>350,000 ل.س</span>
                      </div>
                      <div className={styles.mini}>
                        <Photo name="sunglasses" width={480} alt="" sizes="72px" />
                        <b>نظارة شمسية</b>
                        <span>85,000 ل.س</span>
                      </div>
                      <div className={styles.mini}>
                        <Photo name="tee-cotton" width={400} alt="" sizes="72px" />
                        <b>تيشيرت قطني</b>
                        <span>60,000 ل.س</span>
                      </div>
                    </div>
                  </div>
                  <span className={styles.finger} aria-hidden />
                </div>

                <div className={`${styles.view} ${styles.vChat}`}>
                  <div className={styles.chathead}>
                    <span className={styles.ib}>
                      <Icon>
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </Icon>
                    </span>
                    <span className={styles.av}>ن</span>
                    <div className={styles.nm}>
                      <b>متجر النور</b>
                      <span>متصل الآن</span>
                    </div>
                  </div>
                  <div className={styles.msgs}>
                    <span className={styles.day}>اليوم</span>
                    <div className={`${styles.bub} ${styles.out}`}>
                      <div className={styles.lp}>
                        <Photo
                          name="shirt-linen"
                          width={440}
                          alt=""
                          sizes="220px"
                        />
                        <span>رابط المنتج · متجر النور</span>
                      </div>
                      مرحباً، أريد طلب:
                      <div className={styles.order}>
                        <div>
                          <b>قميص كتان رجالي أبيض</b>
                          <span>المقاس ٤٢ · الكمية ١</span>
                        </div>
                      </div>
                      <div className={styles.tot}>
                        <span>المجموع</span>
                        <span>120,000 ل.س</span>
                      </div>
                      <span className={styles.meta}>
                        ٩:٤٢ <span className={styles.tk}>✓✓</span>
                      </span>
                    </div>
                    <div className={styles.typing} aria-hidden>
                      <i />
                      <i />
                      <i />
                    </div>
                    <div className={`${styles.bub} ${styles.in}`}>
                      أهلاً بك! وصل طلبك ✓
                      <br />
                      نؤكد التوصيل خلال دقائق.
                      <span className={styles.meta}>٩:٤٣</span>
                    </div>
                  </div>
                  <div className={styles.composer}>اكتب رسالة…</div>
                </div>
                <span className={styles.homebar} />
              </div>
            </div>

            <div className={styles.notif} role="status" aria-live="off">
              <span className={styles.ni}>
                <Icon>
                  <path d="M6 8h12l-1 12H7L6 8Z" />
                  <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
                </Icon>
              </span>
              <div>
                <b>
                  <i />
                  طلب جديد
                </b>
                <span>قميص كتان · 120,000 ل.س</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
