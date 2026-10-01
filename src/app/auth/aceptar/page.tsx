import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { SetPassword } from "./set-password";

export const metadata: Metadata = { title: "Crear contraseña" };

export default function AcceptInvitePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo withTagline className="mb-10" />
        <h1 className="mb-2 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">
          Bienvenido al <span className="text-red">programa</span>
        </h1>
        <p className="mb-8 text-sm text-muted">Creá tu contraseña para entrar a tu plan.</p>
        <SetPassword />
      </div>
    </main>
  );
}
