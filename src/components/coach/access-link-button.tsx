"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import type { InviteResult } from "@/lib/invite";
import { Button } from "@/components/ui";
import { InviteLinkCard } from "@/components/coach/invite-link-card";

export function AccessLinkButton({
  action,
  label,
  firstName,
  phone,
  primary = false,
}: {
  primary?: boolean;
  action: () => Promise<InviteResult>;
  label: string;
  firstName: string;
  phone: string | null;
}) {
  const [result, setResult] = useState<InviteResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button type="button" variant={primary ? "primary" : "secondary"} size="sm" disabled={pending} onClick={() => start(async () => setResult(await action()))}>
          <KeyRound size={16} /> {pending ? "Generando…" : label}
        </Button>
      </div>
      {result && <InviteLinkCard invite={result} firstName={firstName} phone={phone} />}
    </div>
  );
}
