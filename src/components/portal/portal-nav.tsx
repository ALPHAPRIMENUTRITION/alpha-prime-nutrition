"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CreditCard, TrendingUp, Utensils } from "lucide-react";
import { cn } from "@/lib/cn";

// Entrenamiento y Check-in se suman en las siguientes fases.
const ITEMS = [
  { label: "Inicio", href: "/portal", icon: Home },
  { label: "Nutrición", href: "/portal/nutricion", icon: Utensils },
  { label: "Progreso", href: "/portal/progreso", icon: TrendingUp },
  { label: "Membresía", href: "/portal/membresia", icon: CreditCard },
];

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navegación"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-graphite/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur"
    >
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${ITEMS.length}, minmax(0, 1fr))` }}>
        {ITEMS.map(({ label, href, icon: Icon }) => {
          const on = href === "/portal" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", on ? "text-red" : "text-muted")}
              >
                <Icon size={21} strokeWidth={1.8} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
