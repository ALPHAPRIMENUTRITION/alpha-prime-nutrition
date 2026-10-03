import { whatsappUrl } from "@/lib/site";

// alphaprimenutrition.com/whatsapp → abre el chat con el coach
export function GET(req: Request) {
  return Response.redirect(whatsappUrl() ?? new URL("/#contacto", req.url).toString(), 302);
}
