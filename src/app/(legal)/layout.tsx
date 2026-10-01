import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" aria-label="Inicio">
        <Logo />
      </Link>
      <article className="mt-10 flex flex-col gap-4 text-[15px] leading-relaxed text-muted [&_h1]:font-display [&_h1]:text-4xl [&_h1]:font-extrabold [&_h1]:uppercase [&_h1]:text-fg [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:text-fg [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </article>
    </div>
  );
}
