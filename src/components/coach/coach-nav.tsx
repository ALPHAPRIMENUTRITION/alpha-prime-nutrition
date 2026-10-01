"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Users, ClipboardCheck, CreditCard } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { label: "Panel", href: "/coach", match: (p: string, f: string | null) => p === "/coach" && !f, icon: LayoutDashboard },
  { label: "Clientes", href: "/coach?filtro=todos#clientes", match: (p: string, f: string | null) => p.startsWith("/coach/clientes") || f === "todos", icon: Users },
  { label: "Check-ins", href: "/coach?filtro=checkin#clientes", match: (_: string, f: string | null) => f === "checkin", icon: ClipboardCheck },
  { label: "Pagos", href: "/coach?filtro=vencidos#clientes", match: (_: string, f: string | null) => f === "vencidos" || f === "por-vencer", icon: CreditCard },
];

export function CoachNav({ variant }: { variant: "side" | "bottom" }) {
  const pathname = usePathname();
  const filtro = useSearchParams().get("filtro");

  if (variant === "bottom") {
    return (
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-graphite/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-4">
          {ITEMS.map(({ label, href, match, icon: Icon }) => {
            const on = match(pathname, filtro);
            return (
              <li key={label}>
                <Link href={href} aria-current={on ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", on ? "text-red" : "text-muted")}>
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

  return (
    <nav aria-label="Navegación principal" className="flex flex-col gap-1">
      {ITEMS.map(({ label, href, match, icon: Icon }) => {
        const on = match(pathname, filtro);
        return (
          <Link
            key={label}
            href={href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
              on ? "bg-panel-2 text-fg" : "text-muted hover:bg-panel hover:text-fg",
            )}
          >
            {on && <span aria-hidden="true" className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-red" />}
            <Icon size={18} strokeWidth={1.8} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
