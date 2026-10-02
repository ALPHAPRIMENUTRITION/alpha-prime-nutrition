import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { LogoHorizontal } from "@/components/brand/logo";
import { PortalNav } from "@/components/portal/portal-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { NotificationsBell } from "@/components/notifications/bell";
import { createClient } from "@/lib/supabase/server";
import { countUnread } from "@/lib/data/notifications";
import { getPortalContext } from "@/lib/data/portal";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireRole("client");
  // Si ya pasó el día de check-in y no lo envió, crea el aviso (máximo 1 por semana; lo decide la base).
  const supabase = await createClient();
  // Ídem para el pago: aviso 3 días antes de la renovación (máximo 1 por ciclo).
  await Promise.all([supabase.rpc("checkin_reminder_tick"), supabase.rpc("payment_reminder_tick")]);
  const [unread, ctx] = await Promise.all([countUnread(), getPortalContext()]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
          <Link href="/portal" className="flex items-center gap-2" aria-label="Inicio">
            <LogoHorizontal className="-ml-3 h-10" />
          </Link>
          <div className="flex items-center gap-1">
            <NotificationsBell href="/portal/notificaciones" unread={unread} />
            <SignOutButton compact />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-5">{children}</main>
      <PortalNav nutrition={ctx?.client.has_nutrition ?? true} training={ctx?.client.has_training ?? true} />
    </div>
  );
}
