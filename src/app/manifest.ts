import type { MetadataRoute } from "next";

// Manifest de la PWA: permite instalar la app en la pantalla de inicio.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Alpha Prime Nutrition",
    short_name: "Alpha Prime",
    description: "Tu plan de nutrición, entrenamiento y check-ins con tu coach.",
    lang: "es",
    dir: "ltr",
    start_url: "/?fuente=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0d",
    theme_color: "#0b0b0d",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Check-in", url: "/portal/checkin", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Entreno de hoy", url: "/portal/entrenamiento", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mi plan nutricional", url: "/portal/nutricion", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
