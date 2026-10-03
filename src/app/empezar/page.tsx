import type { Metadata } from "next";
import { IntakePage } from "@/components/intake/intake-page";
import { submitIntakeAction } from "./actions";
import { whatsappUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "Empezá tu plan · Alpha Prime Nutrition" },
  description: "Dejá tu solicitud en 1 minuto y te cuento cómo armamos tu plan de alimentación y entrenamiento a tu medida.",
  robots: { index: true, follow: true },
};

export default function EmpezarPage() {
  return <IntakePage action={submitIntakeAction.bind(null, null)} whatsappHref={whatsappUrl("Hola Carlos, ya te dejé mi solicitud en tu página.")} />;
}
