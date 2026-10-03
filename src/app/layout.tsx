import type { Metadata, Viewport } from "next";
import "@fontsource/big-shoulders-display/700";
import "@fontsource/big-shoulders-display/800";
import "@fontsource-variable/archivo";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";

export const metadata: Metadata = {
  title: { default: "Alpha Prime Nutrition", template: "%s · Alpha Prime" },
  description: "Coaching nutricional y de entrenamiento personalizado. Unleash your power.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://alphaprimenutrition.com"),
  // Vista previa al compartir links (WhatsApp, etc.): ícono negro de la marca
  openGraph: {
    siteName: "Alpha Prime Nutrition",
    type: "website",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "Alpha Prime Nutrition" }],
  },
  applicationName: "Alpha Prime Nutrition",
  robots: { index: false, follow: false }, // plataforma privada
  // Experiencia de app al instalarla en iPhone (Compartir → Agregar a inicio)
  appleWebApp: { capable: true, title: "Alpha Prime", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/brand/icono-app.svg", type: "image/svg+xml" }, { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
