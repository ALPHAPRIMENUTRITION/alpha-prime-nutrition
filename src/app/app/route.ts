// alphaprimenutrition.com/app → entrar / instalar la app
export function GET(req: Request) {
  return Response.redirect(new URL("/login", req.url).toString(), 302);
}
