import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getPortalContext } from "@/lib/data/portal";
import { loadMessages } from "@/lib/data/chat";
import { ChatThread } from "@/components/chat/chat-thread";

export const metadata: Metadata = { title: "Chat con tu coach" };
export const dynamic = "force-dynamic";

export default async function PortalChatPage() {
  const me = await requireRole("client");
  const ctx = await getPortalContext();
  if (!ctx) return null;
  const messages = await loadMessages(ctx.client.id);
  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="eyebrow">Chat</p>
        <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-tight">{ctx.coachName}</h1>
        <p className="mt-1 text-sm text-muted">Tu coach te responde aquí. Te avisamos con una notificación.</p>
      </header>
      <ChatThread clientId={ctx.client.id} meId={me.id} initial={messages} emptyText="Escribile a tu coach: dudas del plan, cómo te fue en el entreno o una foto de tu comida." />
    </div>
  );
}
