"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { saveAvatarAction } from "@/app/profile-actions";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/cn";

const SIZE = 320;

/** Recorta al centro en cuadrado y comprime a WebP (~20-40 KB). */
async function squareWebp(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bmp.close?.();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob) throw new Error("No se pudo procesar la imagen");
  return blob;
}

/** Foto de perfil tocable: abre la galería/cámara, recorta, sube y guarda. */
export function AvatarUpload({ userId, name, src, size = 64, label = "Cambiar foto de perfil" }: { userId: string; name: string; src: string | null; size?: number; label?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(src);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    if (!file.type.startsWith("image/")) return setErr("Elegí una imagen.");
    setBusy(true);
    try {
      const blob = await squareWebp(file);
      const supabase = createClient();
      const path = `${userId}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const res = await saveAvatarAction(data.publicUrl);
      if (!res.ok) throw new Error(res.error);
      // Borra la foto anterior para no ocupar espacio
      const prev = preview?.split("/storage/v1/object/public/avatars/")[1];
      if (prev) await supabase.storage.from("avatars").remove([decodeURIComponent(prev)]);
      setPreview(data.publicUrl);
      router.refresh();
    } catch {
      setErr("No se pudo subir la foto. Probá con otra imagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        aria-label={label}
        title={label}
        className="relative shrink-0 rounded-full"
        style={{ width: size, height: size }}
      >
        <Avatar name={name} src={preview} size={size} />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full border-2 border-ink bg-red text-white",
            size >= 56 ? "h-7 w-7" : "h-5 w-5",
          )}
        >
          {busy ? <Loader2 size={size >= 56 ? 14 : 10} className="animate-spin" /> : <Camera size={size >= 56 ? 14 : 10} />}
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {err && <p role="alert" className="max-w-[12rem] text-xs text-bad">{err}</p>}
    </div>
  );
}
