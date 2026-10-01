"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/format";
import { Button, Input, Select } from "@/components/ui";

/** Reduce la foto a 1600px (JPEG) antes de subirla: carga más rápida y menos almacenamiento. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85));
}

export function PhotoUpload({ clientId }: { clientId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Elegí una foto.");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError("Formato no soportado. Usá JPG, PNG o WEBP.");
    if (file.size > 15 * 1024 * 1024) return setError("La foto pesa más de 15 MB.");

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sesión vencida. Volvé a entrar.");
      const blob = await shrink(file);
      const path = `${clientId}/${crypto.randomUUID()}.jpg`;
      const up = await supabase.storage.from("progress-photos").upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (up.error) throw new Error("No se pudo subir la foto.");
      const ins = await supabase.from("progress_photos").insert({
        client_id: clientId,
        storage_path: path,
        pose: String(form.get("pose") || "front"),
        taken_at: String(form.get("taken_at") || todayISO()),
        uploaded_by: auth.user.id,
      });
      if (ins.error) {
        await supabase.storage.from("progress-photos").remove([path]);
        throw new Error("No se pudo guardar la foto.");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Camera size={16} /> Subir foto
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-wrap items-end gap-3 rounded-card border border-line bg-panel p-4">
      <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-muted">
        Foto
        <input ref={fileRef} id="photo_file" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="text-sm text-fg file:mr-3 file:rounded-full file:border-0 file:bg-panel-2 file:px-3 file:py-1.5 file:text-fg" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-muted">
        Pose
        <Select id="photo_pose" name="pose" defaultValue="front">
          <option value="front">Frente</option>
          <option value="side">Perfil</option>
          <option value="back">Espalda</option>
          <option value="other">Otra</option>
        </Select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-muted">
        Fecha
        <Input id="photo_date" name="taken_at" type="date" defaultValue={todayISO()} className="w-40" />
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-11" disabled={busy}>{busy ? "Subiendo…" : "Subir"}</Button>
        <Button type="button" variant="ghost" size="sm" className="h-11" onClick={() => setOpen(false)}>Cancelar</Button>
      </div>
      {error && <p role="alert" className="w-full text-sm text-bad">{error}</p>}
    </form>
  );
}
