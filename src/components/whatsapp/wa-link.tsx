"use client";

import { waAppUrl, waWebUrl } from "@/lib/site";

const isMobile = () => typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Botón que abre WhatsApp con un mensaje ya escrito.
 * En el celular abre la app directo (WhatsApp o WhatsApp Business); en la compu, WhatsApp Web.
 */
export function WaLink({
  phone,
  text,
  onOpen,
  className,
  children,
  ariaLabel,
}: {
  phone: string | null | undefined;
  text: string;
  onOpen?: () => void;
  className?: string;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <a
      href={waWebUrl(phone, text)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={className}
      onClick={(e) => {
        onOpen?.();
        if (isMobile()) {
          e.preventDefault();
          window.location.href = waAppUrl(phone, text);
        }
      }}
    >
      {children}
    </a>
  );
}
