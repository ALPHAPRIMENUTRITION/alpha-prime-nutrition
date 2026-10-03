import Link from "next/link";
import { MessageCircle } from "lucide-react";

/** Ícono del chat con contador de no leídos (barra superior). */
export function ChatLink({ href, unread }: { href: string; unread: number }) {
  return (
    <Link
      href={href}
      className="relative grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-panel-2 hover:text-fg"
      aria-label={unread ? `Chat, ${unread} sin leer` : "Chat"}
    >
      <MessageCircle size={20} strokeWidth={1.8} />
      {unread > 0 && (
        <span className="tnum absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
