"use client";

import { useEffect } from "react";
import { SectionError } from "@/components/section-error";

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Solo el identificador: sin datos de clientes en los logs.
    console.error("portal_error", error.digest ?? "sin-digest");
  }, [error]);
  return <SectionError reset={reset} />;
}
