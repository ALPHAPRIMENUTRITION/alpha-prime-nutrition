import type { Metadata } from "next";
import { IntakePage } from "@/components/intake/intake-page";
import { submitIntakeAction } from "./actions";
import { whatsappUrl } from "@/lib/site";
import { SERVICE_VALUE, type SERVICES } from "@/lib/intake";

export const metadata: Metadata = {
  title: { absolute: "Empezá tu plan · Alpha Prime Nutrition" },
  description: "Dejá tu solicitud en 1 minuto y te cuento cómo armamos tu plan de alimentación y entrenamiento a tu medida.",
  robots: { index: true, follow: true },
};

const FROM_SLUG: Record<string, (typeof SERVICES)[number]> = Object.fromEntries(
  Object.entries(SERVICE_VALUE).map(([label, slug]) => [slug, label as (typeof SERVICES)[number]]),
);

export default async function EmpezarPage({ searchParams }: { searchParams: Promise<{ servicio?: string }> }) {
  const servicio = FROM_SLUG[(await searchParams).servicio ?? ""];
  return (
    <IntakePage
      action={submitIntakeAction.bind(null, null)}
      whatsappHref={whatsappUrl("Hola Carlos, ya te dejé mi solicitud en tu página.")}
      initial={servicio ? { service: servicio } : undefined}
    />
  );
}
