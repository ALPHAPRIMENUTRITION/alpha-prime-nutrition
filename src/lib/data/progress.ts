import "server-only";
import { createClient } from "@/lib/supabase/server";
import { mergeMeasurements, type MeasurementRow } from "@/lib/anthropometry";

export interface ProgressPhoto {
  id: string;
  pose: "front" | "side" | "back" | "other";
  taken_at: string;
  url: string | null;
}

/** Mediciones, composición y fotos de un cliente. RLS decide si quien consulta puede verlas. */
export async function getProgressData(clientId: string): Promise<{ rows: MeasurementRow[]; photos: ProgressPhoto[] }> {
  const supabase = await createClient();
  const [{ data: m }, { data: b }, { data: p }] = await Promise.all([
    supabase
      .from("measurements")
      .select("id, measured_at, weight_kg, neck_cm, shoulders_cm, chest_cm, arm_cm, waist_cm, hip_cm, thigh_cm, calf_cm, extra, notes")
      .eq("client_id", clientId)
      .order("measured_at")
      .order("created_at"),
    supabase.from("body_composition").select("id, measured_at, body_fat_pct").eq("client_id", clientId).order("measured_at").order("created_at"),
    supabase.from("progress_photos").select("id, pose, taken_at, storage_path").eq("client_id", clientId).order("taken_at"),
  ]);

  const photos = p ?? [];
  let urls: Record<string, string> = {};
  if (photos.length) {
    const { data: signed } = await supabase.storage
      .from("progress-photos")
      .createSignedUrls(photos.map((x) => x.storage_path), 60 * 60);
    urls = Object.fromEntries((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl]));
  }

  return {
    rows: mergeMeasurements((m ?? []) as never, (b ?? []) as never),
    photos: photos.map((x) => ({ id: x.id, pose: x.pose, taken_at: x.taken_at, url: urls[x.storage_path] ?? null })),
  };
}
