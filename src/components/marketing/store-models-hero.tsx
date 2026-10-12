import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const MODELS = [
  {
    src: "/marketing/store-model-fashion.png",
    alt: "نموذج متجر أزياء",
    rotate: "-rotate-[3.5deg]",
    offset: "translate-y-3 sm:translate-y-5",
    float: "animate-ys-model-float",
  },
  {
    src: "/marketing/store-model-sports.png",
    alt: "نموذج متجر رياضي",
    rotate: "rotate-[1.5deg]",
    offset: "-translate-y-1 sm:-translate-y-3",
    float: "animate-ys-model-float-delay",
  },
  {
    src: "/marketing/store-model-auto.png",
    alt: "نموذج متجر سيارات",
    rotate: "rotate-[4deg]",
    offset: "translate-y-4 sm:translate-y-7",
    float: "animate-ys-model-float-delay-2",
  },
] as const;

function Shot({
  src,
  alt,
  priority = false,
  sizes,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  sizes: string;
}) {
  return (
    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-white/90 bg-white shadow-[0_22px_48px_-22px_rgba(15,23,42,0.48)] ring-1 ring-slate-900/5">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-top"
        sizes={sizes}
        priority={priority}
      />
    </div>
  );
}

/** Desktop: three tilted shots. Mobile: a swipeable row, one shot at a time. */
export function StoreModelsHero({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div
        className="ys-scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:hidden"
        role="region"
        aria-label="نماذج المتاجر"
      >
        {MODELS.map((model, index) => (
          <div
            key={model.src}
            className="w-[80vw] shrink-0 snap-center"
          >
            <Shot
              src={model.src}
              alt={model.alt}
              priority={index === 0}
              sizes="80vw"
            />
          </div>
        ))}
      </div>

      <div className="mx-auto hidden w-full max-w-5xl items-center justify-center gap-4 px-2 md:flex lg:gap-5">
        {MODELS.map((model) => (
          <div
            key={model.src}
            className={cn("w-[32%] min-w-0", model.rotate, model.offset)}
          >
            <div className={model.float}>
              <Shot
                src={model.src}
                alt={model.alt}
                priority={model.src.includes("fashion")}
                sizes="340px"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
