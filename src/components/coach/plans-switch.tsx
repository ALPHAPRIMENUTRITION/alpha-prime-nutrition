import Link from "next/link";
import { cn } from "@/lib/cn";

/** Selector Nutrición / Entrenamiento en la sección Planes. */
export function PlansSwitch({ current }: { current: "planes" | "rutinas" }) {
  const items = [
    { id: "planes", label: "Nutrición", href: "/coach/planes" },
    { id: "rutinas", label: "Entrenamiento", href: "/coach/rutinas" },
  ] as const;
  return (
    <nav aria-label="Tipo de plan" className="inline-flex rounded-full border border-line bg-panel p-1">
      {items.map((i) => (
        <Link
          key={i.id}
          href={i.href}
          aria-current={current === i.id ? "page" : undefined}
          className={cn("rounded-full px-4 py-1.5 text-sm font-semibold", current === i.id ? "bg-fg text-ink" : "text-muted hover:text-fg")}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
