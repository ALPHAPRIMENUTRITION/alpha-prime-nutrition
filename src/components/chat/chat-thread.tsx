"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, SendHorizontal, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";

export type ChatMessage = {
  id: string;
  client_id: string;
  sender_id: string;
  body: string | null;
  image_path: string | null;
  created_at: string;
  read_at: string | null;
  pending?: boolean;
};

const MAX_SIDE = 1280;
const POLL_MS = 15_000;

/** Reduce la foto a 1280 px en WebP (~150-300 KB) antes de subirla. */
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close?.();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.8));
  if (!blob) throw new Error("No se pudo procesar la imagen");
  return blob;
}

/** Convierte los links del texto en enlaces tocables. */
function Linkify({ text, mine }: { text: string; mine: boolean }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target={p.includes(window.location.host) ? undefined : "_blank"} rel="noopener noreferrer" className={cn("break-all underline", mine ? "text-white" : "text-red")}>
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const dayFmt = new Intl.DateTimeFormat("es-SV", { weekday: "long", day: "numeric", month: "long", timeZone: "America/El_Salvador" });
const timeFmt = new Intl.DateTimeFormat("es-SV", { hour: "numeric", minute: "2-digit", timeZone: "America/El_Salvador" });
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });

function dayLabel(iso: string) {
  const k = dayKey(iso);
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - 86_400_000).toISOString());
  if (k === today) return "Hoy";
  if (k === yesterday) return "Ayer";
  return dayFmt.format(new Date(iso));
}

export function ChatThread({
  clientId,
  meId,
  initial,
  emptyText,
  bottomOffset = "nav",
}: {
  clientId: string;
  meId: string;
  initial: ChatMessage[];
  emptyText: string;
  /** "nav": hay barra inferior fija (celular); en escritorio del coach no. */
  bottomOffset?: "nav" | "coach";
}) {
  const supabase = useRef(createClient()).current;
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef(initial.at(-1)?.created_at ?? new Date(0).toISOString());

  const add = useCallback((rows: ChatMessage[]) => {
    if (!rows.length) return;
    setMessages((cur) => {
      const ids = new Set(cur.map((m) => m.id));
      const next = [...cur.filter((m) => !m.pending || !rows.some((r) => r.sender_id === m.sender_id && r.body === m.body && r.image_path === m.image_path)), ...rows.filter((r) => !ids.has(r.id))];
      next.sort((a, b) => a.created_at.localeCompare(b.created_at));
      const last = next.filter((m) => !m.pending).at(-1);
      if (last) lastAt.current = last.created_at;
      return next;
    });
  }, []);

  const markRead = useCallback(() => {
    if (document.visibilityState === "visible") supabase.rpc("mark_chat_read", { p_client: clientId }).then(() => {});
  }, [supabase, clientId]);

  const fetchNew = useCallback(async () => {
    const { data } = await supabase
      .from("messages")
      .select("id, client_id, sender_id, body, image_path, created_at, read_at")
      .eq("client_id", clientId)
      .gt("created_at", lastAt.current)
      .order("created_at", { ascending: true })
      .limit(100);
    if (data?.length) {
      add(data as ChatMessage[]);
      if (data.some((m) => m.sender_id !== meId)) markRead();
    }
  }, [supabase, clientId, add, markRead, meId]);

  // Tiempo real + respaldo cada 15 s (por si la conexión en vivo se corta)
  useEffect(() => {
    // Al abrir: marca como leído y actualiza el contador de la barra superior
    if (initial.some((m) => m.sender_id !== meId && !m.read_at)) {
      supabase.rpc("mark_chat_read", { p_client: clientId }).then(() => router.refresh());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const ch = supabase
      .channel(`chat-${clientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `client_id=eq.${clientId}` }, () => fetchNew())
      .subscribe();
    const t = setInterval(fetchNew, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && fetchNew();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [supabase, clientId, fetchNew, markRead]);

  // Links firmados para las fotos
  useEffect(() => {
    const missing = messages.filter((m) => m.image_path && !m.pending && !urls[m.image_path]).map((m) => m.image_path!);
    if (!missing.length) return;
    supabase.storage
      .from("chat")
      .createSignedUrls(missing, 60 * 60)
      .then(({ data }) => {
        if (!data) return;
        setUrls((u) => ({ ...u, ...Object.fromEntries(data.filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl as string])) }));
      });
  }, [messages, urls, supabase]);

  useLayoutEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(body: string | null, image_path: string | null) {
    const temp: ChatMessage = { id: `tmp-${Date.now()}`, client_id: clientId, sender_id: meId, body, image_path, created_at: new Date().toISOString(), read_at: null, pending: true };
    setMessages((m) => [...m, temp]);
    const { data, error } = await supabase.from("messages").insert({ client_id: clientId, body, image_path }).select("id, client_id, sender_id, body, image_path, created_at, read_at").single();
    if (error || !data) {
      setMessages((m) => m.filter((x) => x.id !== temp.id));
      setErr("No se pudo enviar. Revisá tu conexión.");
      return false;
    }
    setMessages((m) => m.filter((x) => x.id !== temp.id));
    add([data as ChatMessage]);
    return true;
  }

  async function onSend() {
    const body = text.trim();
    if (!body || sending) return;
    setErr(null);
    setSending(true);
    setText("");
    if (taRef.current) taRef.current.style.height = "";
    const ok = await send(body.slice(0, 4000), null);
    if (!ok) setText(body);
    setSending(false);
    taRef.current?.focus();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("Elegí una imagen.");
    setErr(null);
    setSending(true);
    try {
      const blob = await compress(file);
      const path = `${clientId}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage.from("chat").upload(path, blob, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      await send(null, path);
    } catch {
      setErr("No se pudo enviar la foto.");
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col">
      <div className="flex min-h-[50dvh] flex-col gap-1.5 pb-28">
        {messages.length === 0 && <p className="mx-auto mt-10 max-w-xs text-center text-sm text-muted">{emptyText}</p>}
        {messages.map((m, i) => {
          const mine = m.sender_id === meId;
          const newDay = i === 0 || dayKey(messages[i - 1]!.created_at) !== dayKey(m.created_at);
          const url = m.image_path ? urls[m.image_path] : null;
          return (
            <div key={m.id} className="flex flex-col">
              {newDay && <p className="my-3 self-center rounded-full bg-panel-2 px-3 py-1 text-xs font-semibold capitalize text-muted">{dayLabel(m.created_at)}</p>}
              <div className={cn("flex max-w-[82%] flex-col", mine ? "items-end self-end" : "items-start self-start")}>
                <div
                  className={cn(
                    "overflow-hidden rounded-2xl text-[15px] leading-snug",
                    mine ? "rounded-br-md bg-red text-white" : "rounded-bl-md border border-line bg-panel text-fg",
                    m.pending && "opacity-60",
                    m.image_path ? "p-1" : "px-3.5 py-2",
                  )}
                >
                  {m.image_path &&
                    (url ? (
                      <button type="button" onClick={() => setZoom(url)} aria-label="Ver foto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Foto enviada" className="max-h-72 w-auto rounded-xl object-cover" />
                      </button>
                    ) : (
                      <span className="grid h-40 w-40 place-items-center rounded-xl bg-ink/30">
                        <Loader2 className="animate-spin" size={20} />
                      </span>
                    ))}
                  {m.body && <p className="whitespace-pre-wrap break-words"><Linkify text={m.body} mine={mine} /></p>}
                </div>
                <span className="mt-0.5 px-1 text-[11px] text-faint">
                  {m.pending ? "Enviando…" : timeFmt.format(new Date(m.created_at))}
                  {mine && !m.pending && m.read_at && " · Visto"}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Caja para escribir */}
      <div
        className={cn(
          "fixed inset-x-0 z-20 border-t border-line bg-ink/95 backdrop-blur",
          bottomOffset === "nav" ? "bottom-[calc(env(safe-area-inset-bottom,0px)+64px)]" : "bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] lg:bottom-0 lg:left-[248px]",
        )}
      >
        <div className={cn("mx-auto flex items-end gap-2 px-3 py-2.5", bottomOffset === "nav" ? "max-w-lg" : "max-w-3xl")}>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            aria-label="Enviar foto"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg disabled:opacity-50"
          >
            <ImagePlus size={21} />
          </button>
          <textarea
            ref={taRef}
            value={text}
            rows={1}
            maxLength={4000}
            placeholder="Escribí un mensaje…"
            aria-label="Mensaje"
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 1024px)").matches) {
                e.preventDefault();
                onSend();
              }
            }}
            className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-panel px-4 py-2.5 text-base text-fg placeholder:text-faint focus:border-faint focus:outline-none"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={sending || !text.trim()}
            aria-label="Enviar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red text-white hover:bg-red-hover disabled:opacity-40"
          >
            {sending ? <Loader2 size={19} className="animate-spin" /> : <SendHorizontal size={19} />}
          </button>
        </div>
        {err && <p role="alert" className="mx-auto max-w-lg px-4 pb-2 text-xs text-bad">{err}</p>}
      </div>

      {zoom && (
        <div role="dialog" aria-modal="true" aria-label="Foto" className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" onClick={() => setZoom(null)}>
          <button type="button" aria-label="Cerrar" className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+16px)] grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white">
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Foto" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
