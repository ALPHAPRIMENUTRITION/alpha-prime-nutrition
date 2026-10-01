import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { RecoverForm } from "./recover-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Logo withTagline className="mb-10" />
        <h1 className="mb-2 font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">Recuperar acceso</h1>
        <p className="mb-8 text-sm text-muted">Te enviamos un link para crear una nueva contraseña.</p>
        <RecoverForm />
        <Link href="/login" className="mt-6 inline-block text-sm text-muted underline underline-offset-4 hover:text-fg">
          Volver a entrar
        </Link>
      </div>
    </main>
  );
}
