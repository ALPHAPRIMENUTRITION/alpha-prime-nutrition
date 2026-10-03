import type { Metadata } from "next";
import Link from "next/link";
import { Camera } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { coachThreads } from "@/lib/data/chat";
import { relativeDays } from "@/lib/format";
import { Avatar, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Chat" };
export const dynamic = "force-dynamic";

export default async function CoachChatList() {
  await requireRole("coach");
  const threads = await coachThreads();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header>
        <p className="eyebrow">Mensajes con tus clientes</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl">Chat</h1>
        <p className="mt-2 text-sm text-muted">Para escribirle a un cliente por primera vez, entrá a su perfil y tocá «Mensaje».</p>
      </header>
      {threads.length === 0 ? (
        <Card>
          <EmptyState title="Sin conversaciones" description="Cuando un cliente te escriba desde la app (o vos le escribas desde su perfil) aparece aquí." />
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {threads.map((t) => {
              const name = `${t.first_name} ${t.last_name}`.trim();
              return (
                <li key={t.client_id}>
                  <Link href={`/coach/chat/${t.client_id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-panel-2">
                    <Avatar name={name} src={t.avatar_url} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate", t.unread ? "font-bold" : "font-semibold")}>{name}</p>
                      <p className={cn("flex items-center gap-1 truncate text-sm", t.unread ? "text-fg" : "text-muted")}>
                        {t.last_from_me && <span className="text-faint">Vos:</span>}
                        {t.last_image && !t.last_body ? (
                          <>
                            <Camera size={14} /> Foto
                          </>
                        ) : (
                          <span className="truncate">{t.last_body}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-faint">{relativeDays(t.last_at)}</span>
                      {t.unread > 0 && <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-red px-1.5 text-[11px] font-bold text-white">{t.unread}</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
