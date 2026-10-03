import { FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

/** Fotos/PDF que subió el cliente en el cuestionario (links privados de 1 hora). */
export async function IntakeFiles({ paths }: { paths: string[] }) {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("intake-files").createSignedUrls(paths, 60 * 60);
  const files = (data ?? []).flatMap((d) => (d.signedUrl ? [{ path: d.path ?? "", signedUrl: d.signedUrl as string }] : []));
  if (!files.length) return <span className="text-sm text-faint">{paths.length} archivo(s) (no se pudieron abrir)</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f, i) =>
        f.path?.endsWith(".pdf") ? (
          <a key={f.path} href={f.signedUrl} target="_blank" rel="noopener noreferrer" className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border border-line bg-ink text-xs text-muted hover:text-fg">
            <FileText size={24} className="text-red" /> PDF {i + 1}
          </a>
        ) : (
          <a key={f.path} href={f.signedUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.signedUrl} alt={`Plan anterior ${i + 1}`} className="h-24 w-24 object-cover" />
          </a>
        ),
      )}
    </div>
  );
}
