import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadMessages } from "@/lib/data/chat";
import { Avatar } from "@/components/ui";
import { ChatThread } from "@/components/chat/chat-thread";

export const metadata: Metadata = { title: "Chat" };
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CoachChatPage({ params }: { params: Promise<{ clientId: string }> }) {
  const me = await requireRole("coach");
  const { clientId } = await params;
  if (!UUID.test(clientId)) notFound();
  const supabase = await createClient();
  const { data: overview } = await supabase.from("coach_client_overview").select("id, first_name, last_name, avatar_url").eq("id", clientId).maybeSingle();
  if (!overview) notFound();
  const name = `${overview.first_name} ${overview.last_name}`.trim();
  const messages = await loadMessages(clientId);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link href="/coach/chat" aria-label="Volver al chat" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-panel-2 hover:text-fg">
          <ArrowLeft size={18} />
        </Link>
        <Link href={`/coach/clientes/${clientId}`} className="flex min-w-0 items-center gap-3">
          <Avatar name={name} src={overview.avatar_url} size={40} />
          <span className="min-w-0">
            <span className="block truncate font-display text-2xl font-extrabold uppercase leading-none">{name}</span>
            <span className="text-xs text-muted">Ver perfil</span>
          </span>
        </Link>
      </div>
      <ChatThread clientId={clientId} meId={me.id} initial={messages} bottomOffset="coach" emptyText={`Escribile a ${overview.first_name}. Le llega una notificación en su celular.`} />
    </div>
  );
}
