import { LogOut } from "lucide-react";

/** Cierra sesión con POST (evita cierres accidentales por prefetch de enlaces). */
export function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-panel-2 hover:text-fg"
        aria-label="Cerrar sesión"
      >
        <LogOut size={18} strokeWidth={1.8} />
        {!compact && <span>Cerrar sesión</span>}
      </button>
    </form>
  );
}
