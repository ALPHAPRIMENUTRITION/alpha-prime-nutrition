import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { LogoMark } from "@/components/brand/logo";
import { PortalNav } from "@/components/portal/portal-nav";
import { SignOutButton } from "@/components/sign-out-button";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireRole("client");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)]">
          <Link href="/portal" className="flex items-center gap-2" aria-label="Inicio">
            <LogoMark className="h-7 w-7" />
            <span className="font-display text-lg font-extrabold uppercase tracking-wide">Alpha Prime</span>
          </Link>
          <SignOutButton compact />
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-5">{children}</main>
      <PortalNav />
    </div>
  );
}
