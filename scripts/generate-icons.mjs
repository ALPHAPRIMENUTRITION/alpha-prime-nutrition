// Genera los íconos de la PWA a partir del monograma de la marca.
// Uso: node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const GLYPH = `
  <path d="M20 7 L32 33 H26.5 L20 18.5 L13.5 33 H8 Z" fill="#f3f3f4"/>
  <path d="M11 27 L31 21 L30 25 L10 31 Z" fill="#e3242f"/>`;

// Ícono normal: fondo a sangre (Android/iOS recortan las esquinas)
const full = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" fill="#18181c"/>
  <g transform="translate(20 20) scale(${scale}) translate(-20 -20)">${GLYPH}</g></svg>`;

// Favicon: igual al de la app (esquinas redondeadas)
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">
  <rect width="40" height="40" rx="9" fill="#18181c"/>${GLYPH}</svg>`;

mkdirSync("public/icons", { recursive: true });
const out = [
  ["public/icons/icon-192.png", full(0.86), 192],
  ["public/icons/icon-512.png", full(0.86), 512],
  // "maskable": el contenido dentro de la zona segura (círculo del 80 %)
  ["public/icons/maskable-512.png", full(0.62), 512],
  ["public/icons/apple-touch-icon.png", full(0.8), 180],
];
for (const [file, svg, size] of out) {
  await sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(file);
  console.log("ok", file);
}
writeFileSync("src/app/icon.svg", favicon);
console.log("ok src/app/icon.svg");
