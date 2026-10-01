import Link from "next/link";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="font-display text-7xl font-extrabold text-red">404</p>
        <p className="mt-2 text-muted">Esta página no existe o no tenés acceso a ella.</p>
        <Link href="/" className={buttonClass("secondary", "md", "mt-6")}>
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
