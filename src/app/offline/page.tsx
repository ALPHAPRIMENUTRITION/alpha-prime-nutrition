import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { RetryButton } from "@/components/pwa/retry-button";

export const metadata: Metadata = { title: "Sin conexión" };
export const dynamic = "force-static";

// La muestra el service worker cuando no hay internet. No usa datos del usuario.
export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 pt-[env(safe-area-inset-top,0px)] text-center">
      <div className="flex max-w-xs flex-col items-center gap-5">
        <LogoMark className="h-14 w-14" />
        <span className="grid h-14 w-14 place-items-center rounded-full bg-panel-2 text-muted">
          <WifiOff size={26} aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight">Sin conexión</h1>
          <p className="mt-2 text-sm text-muted">Revisá tu internet. Tus datos están guardados en la nube y vas a verlos apenas vuelva la conexión.</p>
        </div>
        <RetryButton />
      </div>
    </main>
  );
}
