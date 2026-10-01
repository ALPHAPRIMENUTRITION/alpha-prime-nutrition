import type { Metadata, Viewport } from "next";
import "@fontsource/big-shoulders-display/700";
import "@fontsource/big-shoulders-display/800";
import "@fontsource-variable/archivo";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Alpha Prime Nutrition", template: "%s · Alpha Prime" },
  description: "Coaching nutricional y de entrenamiento personalizado. Unleash your power.",
  applicationName: "Alpha Prime Nutrition",
  robots: { index: false, follow: false }, // plataforma privada
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
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
