/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/cn";

// Logo de la marca (SVG vectorial, versiones para fondo oscuro).

/** Solo el símbolo "A". */
export function LogoMark({ className }: { className?: string; large?: boolean }) {
  return <img src="/brand/simbolo.svg" alt="" aria-hidden="true" width={100} height={100} className={cn("h-8 w-8 shrink-0", className)} />;
}

/** Símbolo + "ALPHA PRIME / NUTRITION" en línea (barras superiores y menú). */
export function LogoHorizontal({ className }: { className?: string }) {
  return <img src="/brand/logo-horizontal.svg" alt="Alpha Prime Nutrition" width={600} height={140} className={cn("h-9 w-auto shrink-0", className)} />;
}

export function Logo({ withTagline = false, className }: { withTagline?: boolean; className?: string }) {
  // Pantallas de acceso: versión vertical con "Unleash your power"
  if (withTagline) {
    return (
      <img
        src="/brand/logo-vertical.svg"
        alt="Alpha Prime Nutrition · Unleash your power"
        width={640}
        height={470}
        className={cn("-ml-6 h-auto w-64 max-w-full", className)}
      />
    );
  }
  return <LogoHorizontal className={cn("-ml-1.5 h-12", className)} />;
}
