import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile, HOME_BY_ROLE } from "@/lib/auth";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";
import { AuthHashRedirect } from "@/components/auth-hash-redirect";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Sesión válida de verdad (consulta al servidor de autenticación) → a su inicio
  const profile = await getSessionProfile();
  if (profile) redirect(HOME_BY_ROLE[profile.role]);

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      {/* Franja diagonal de marca */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 top-0 h-[140%] w-80 rotate-[18deg] bg-gradient-to-b from-red/25 via-red/5 to-transparent"
      />
      <div className="relative w-full max-w-sm">
        <Logo withTagline className="mb-10" />
        <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">
          Tu programa.
          <br />
          <span className="text-red">Tu progreso.</span>
        </h1>
        <p className="mb-8 mt-3 text-sm text-muted">Entrá con la cuenta que te dio tu coach.</p>
        <AuthHashRedirect />
        <LoginForm next={next} />
        <Link href="/recuperar" className="mt-4 inline-block text-sm text-muted underline underline-offset-4 hover:text-fg">
          ¿Olvidaste tu contraseña?
        </Link>
        <p className="mt-8 text-xs text-faint">
          Al entrar aceptás los{" "}
          <Link href="/terminos" className="underline underline-offset-2 hover:text-fg">
            términos
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" className="underline underline-offset-2 hover:text-fg">
            política de privacidad
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
