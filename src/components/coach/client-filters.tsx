import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { CLIENT_FILTERS, type ClientFilter } from "@/lib/client-filters";

/** Buscador y filtros por URL: funcionan sin JavaScript y se pueden compartir. */
export function ClientFilters({ q, filtro }: { q: string; filtro: ClientFilter }) {
  const hrefFor = (value: ClientFilter) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (value !== "todos") sp.set("filtro", value);
    const s = sp.toString();
    return `/coach${s ? `?${s}` : ""}#clientes`;
  };

  return (
    <div className="flex flex-col gap-3">
      <form action="/coach" method="get" role="search" className="relative">
        {filtro !== "todos" && <input type="hidden" name="filtro" value={filtro} />}
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
        <label htmlFor="client-search" className="sr-only">
          Buscar clientes
        </label>
        <input
          id="client-search"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={80}
          placeholder="Buscar por nombre o correo"
          className="h-11 w-full rounded-xl border border-line bg-graphite pl-10 pr-24 text-[15px] placeholder:text-faint focus:border-red focus:outline-none"
        />
        <button type="submit" className="absolute right-1.5 top-1.5 h-8 rounded-lg bg-panel-2 px-3 text-sm font-semibold hover:bg-line">
          Buscar
        </button>
      </form>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
        {CLIENT_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={hrefFor(f.value)}
            scroll={false}
            aria-current={filtro === f.value ? "true" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
              filtro === f.value ? "border-fg bg-fg text-ink" : "border-line text-muted hover:border-faint hover:text-fg",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
