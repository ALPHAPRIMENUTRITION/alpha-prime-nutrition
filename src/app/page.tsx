import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionProfile, HOME_BY_ROLE } from "@/lib/auth";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: { absolute: "Alpha Prime Nutrition · Asesorías de alimentación y entrenamiento" },
  description: "Plan de alimentación y rutina personalizados, con evaluación online o presencial y seguimiento semanal desde tu propia app.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export default async function Home({ searchParams }: { searchParams: Promise<{ fuente?: string }> }) {
  const profile = await getSessionProfile();
  if (profile) redirect(HOME_BY_ROLE[profile.role]);
  // Desde la app instalada se va directo a iniciar sesión
  if ((await searchParams).fuente === "app") redirect("/login");
  return <Landing />;
}
