// Genera el logo de la app y los íconos de la PWA a partir del escudo de la marca.
// Uso: node scripts/generate-icons.mjs   (fuente: brand-src/logo-original.webp)
import sharp from "sharp";
import { mkdirSync, rmSync } from "node:fs";

const SRC = "brand-src/logo-original.webp";
const BG = "#0b0b0d";
mkdirSync("public/icons", { recursive: true });
mkdirSync("public/brand", { recursive: true });

const square = (size, file) => sharp(SRC).resize(size, size).png({ compressionLevel: 9 }).toFile(file);

// Escudo circular con fondo transparente (para usar dentro de la app)
async function round(size, file) {
  const mask = Buffer.from(`<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - size * 0.004}" fill="#fff"/></svg>`);
  await sharp(SRC).resize(size, size).composite([{ input: mask, blend: "dest-in" }]).webp({ quality: 86 }).toFile(file);
}

// "maskable": el escudo dentro de la zona segura (80 %) sobre fondo de marca
async function maskable(size, file) {
  const inner = Math.round(size * 0.8);
  const logo = await sharp(SRC).resize(inner, inner).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(file);
}

await round(512, "public/brand/logo-512.webp");
await round(160, "public/brand/logo-160.webp");
await square(192, "public/icons/icon-192.png");
await square(512, "public/icons/icon-512.png");
await square(180, "public/icons/apple-touch-icon.png");
await square(48, "public/icons/favicon-48.png");
await maskable(512, "public/icons/maskable-512.png");
rmSync("src/app/icon.svg", { force: true });
console.log("íconos generados");
