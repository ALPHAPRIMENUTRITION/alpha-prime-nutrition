// Genera los íconos de la PWA a partir del logo de la marca (SVG vectorial).
// Uso: node scripts/generate-icons.mjs   (fuentes: brand-src/svg)
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SQUARE = "brand-src/svg/icono-negro-cuadrado.svg"; // fondo negro a sangre (Android/iOS recortan)
const ROUNDED = "brand-src/svg/icono-negro-redondeado.svg"; // esquinas redondeadas (favicon)
mkdirSync("public/icons", { recursive: true });

const png = (src, size, file) => sharp(src, { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toFile(file);

await png(SQUARE, 192, "public/icons/icon-192.png");
await png(SQUARE, 512, "public/icons/icon-512.png");
await png(SQUARE, 180, "public/icons/apple-touch-icon.png");
// El símbolo ocupa ~60 % del lienzo: ya cae dentro de la zona segura de los íconos "maskable"
await png(SQUARE, 512, "public/icons/maskable-512.png");
await png(ROUNDED, 48, "public/icons/favicon-48.png");
console.log("íconos generados");
