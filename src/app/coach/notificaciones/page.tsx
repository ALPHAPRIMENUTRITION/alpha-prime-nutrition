import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { listMyNotifications } from "@/lib/data/notifications";
import { NotificationsList } from "@/components/notifications/notifications-list";

export const metadata: Metadata = { title: "Notificaciones" };

export default async function NotificationsPage() {
  await requireRole("coach");
  const items = await listMyNotifications();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.9] tracking-tight">Notificaciones</h1>
      <NotificationsList items={items} />
    </div>
  );
}
