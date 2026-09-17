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

/** Three equal-size storefront mockups, slightly scattered side by side. */
export function StoreModelsHero({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-5xl items-center justify-center gap-2.5 px-1 sm:gap-4 sm:px-2 lg:gap-5",
        className,
      )}
    >
      {MODELS.map((model) => (
        <div
          key={model.src}
          className={cn("w-[32%] min-w-0", model.rotate, model.offset)}
        >
          <div className={model.float}>
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl border border-white/90 bg-white shadow-[0_22px_48px_-22px_rgba(15,23,42,0.48)] ring-1 ring-slate-900/5 sm:rounded-2xl">
              <Image
                src={model.src}
                alt={model.alt}
                fill
                className="object-cover object-top"
                sizes="(max-width: 640px) 34vw, 340px"
                priority={model.src.includes("fashion")}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
