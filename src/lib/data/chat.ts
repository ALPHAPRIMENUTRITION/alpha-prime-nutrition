import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/components/chat/chat-thread";

export async function loadMessages(clientId: string, limit = 150) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, client_id, sender_id, body, image_path, created_at, read_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as ChatMessage[]).reverse();
}

/** Mensajes sin leer que le escribieron al usuario (todas sus conversaciones). */
export async function unreadChatCount(meId: string) {
  const supabase = await createClient();
  const { count } = await supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null).neq("sender_id", meId);
  return count ?? 0;
}

export type ChatThreadRow = {
  client_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  last_body: string | null;
  last_image: boolean;
  last_at: string;
  last_from_me: boolean;
  unread: number;
};

export async function coachThreads() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("coach_chat_threads");
  return (data ?? []) as ChatThreadRow[];
}
