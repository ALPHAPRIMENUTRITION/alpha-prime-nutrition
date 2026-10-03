import { Suspense } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Logo, LogoHorizontal } from "@/components/brand/logo";
import { CoachNav } from "@/components/coach/coach-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { unreadChatCount } from "@/lib/data/chat";
import { ChatLink } from "@/components/chat/chat-link";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole("coach");
  const supabase = await createClient();
  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  const chatUnread = await unreadChatCount(profile.id);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      {/* Barra lateral (escritorio) */}
      <aside className="hidden border-r border-line bg-graphite lg:block">
        <div className="sticky top-0 flex h-dvh flex-col justify-between px-4 py-6">
        <div className="flex flex-col gap-8">
          <Link href="/coach" aria-label="Panel">
            <Logo />
          </Link>
          <Suspense>
            <CoachNav variant="side" />
          </Suspense>
        </div>
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex items-center gap-3 px-1">
            <AvatarUpload userId={profile.id} name={profile.full_name || "Coach"} src={profile.avatar_url} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.full_name}</p>
              <p className="text-xs text-faint">Coach</p>
            </div>
          </div>
          <SignOutButton />
        </div>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Barra superior (móvil) */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-ink/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] backdrop-blur lg:hidden">
          <Link href="/coach" className="flex items-center gap-2" aria-label="Panel">
            <LogoHorizontal className="-ml-3 h-10" />
          </Link>
          <div className="flex items-center gap-1">
            <ChatLink href="/coach/chat" unread={chatUnread} />
            <NotificationsLink unread={unread ?? 0} />
            <SignOutButton compact />
          </div>
        </header>

        <div className="hidden justify-end gap-1 px-8 pt-6 lg:flex">
          <ChatLink href="/coach/chat" unread={chatUnread} />
          <NotificationsLink unread={unread ?? 0} />
        </div>

        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 lg:px-8 lg:pb-12">{children}</main>
      </div>

      <Suspense>
        <CoachNav variant="bottom" />
      </Suspense>
    </div>
  );
}

function NotificationsLink({ unread }: { unread: number }) {
  return (
    <Link
      href="/coach/notificaciones"
      className="relative grid h-10 w-10 place-items-center rounded-full text-muted transition-colors hover:bg-panel-2 hover:text-fg"
      aria-label={unread ? `Alertas, ${unread} sin leer` : "Alertas"}
    >
      <Bell size={20} strokeWidth={1.8} />
      {unread > 0 && (
        <span className="tnum absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
