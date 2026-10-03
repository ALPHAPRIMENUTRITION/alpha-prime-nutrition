import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntakePage } from "@/components/intake/intake-page";
import { submitIntakeAction } from "@/app/empezar/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Cuestionario inicial", robots: { index: false, follow: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Link personal de cada cliente: lo que llene queda en su expediente. */
export default async function ClientIntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();
  const supabase = await createClient();
  const { data: name } = await supabase.rpc("intake_link_name", { p_token: token });
  if (!name) notFound();
  return <IntakePage action={submitIntakeAction.bind(null, token)} greetingName={name as string} whatsappHref={null} />;
}
