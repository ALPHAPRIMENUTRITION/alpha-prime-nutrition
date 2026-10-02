import { cn } from "@/lib/cn";

/** Escudo de la marca (imagen circular). Se usa chico en barras y grande en las pantallas de acceso. */
export function LogoMark({ className, large = false }: { className?: string; large?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={large ? "/brand/logo-512.webp" : "/brand/logo-160.webp"}
      alt=""
      aria-hidden="true"
      width={large ? 512 : 160}
      height={large ? 512 : 160}
      decoding="async"
      className={cn("h-8 w-8 shrink-0 rounded-full", className)}
    />
  );
}

export function Logo({ withTagline = false, className }: { withTagline?: boolean; className?: string }) {
  // Pantallas de acceso: escudo grande, que ya incluye el nombre
  if (withTagline) {
    return (
      <div className={cn("flex flex-col items-start gap-3", className)}>
        <LogoMark large className="h-28 w-28 shadow-[0_0_40px_rgba(227,36,47,0.18)]" />
        <span className="sr-only">Alpha Prime Nutrition</span>
        <div className="eyebrow !text-[10px] !tracking-[0.28em]">Unleash your power</div>
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className="h-10 w-10" />
      <div className="font-display text-[19px] font-extrabold uppercase leading-none tracking-[0.04em]">
        Alpha Prime <span className="text-red">Nutrition</span>
      </div>
    </div>
  );
}
