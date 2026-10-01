import { cn } from "@/lib/cn";

/** Marca: monograma "A" con corte diagonal rojo + nombre en condensada. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("h-8 w-8", className)}>
      <rect width="40" height="40" rx="9" fill="#18181c" />
      <path d="M20 7 L32 33 H26.5 L20 18.5 L13.5 33 H8 Z" fill="#f3f3f4" />
      <path d="M11 27 L31 21 L30 25 L10 31 Z" fill="#e3242f" />
    </svg>
  );
}

export function Logo({ withTagline = false, className }: { withTagline?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-none">
        <div className="font-display text-[19px] font-extrabold uppercase tracking-[0.04em]">
          Alpha Prime <span className="text-red">Nutrition</span>
        </div>
        {withTagline && <div className="eyebrow mt-1 !text-[10px] !tracking-[0.28em]">Unleash your power</div>}
      </div>
    </div>
  );
}
