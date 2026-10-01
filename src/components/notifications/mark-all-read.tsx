"use client";

import { useEffect, useRef } from "react";
import { markAllNotificationsReadAction } from "@/app/notifications-actions";

/** Al abrir la página de notificaciones, se marcan como leídas (después de mostrarlas). */
export function MarkAllRead() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const t = setTimeout(() => void markAllNotificationsReadAction(), 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
