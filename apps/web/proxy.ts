import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Constante duplicada de propósito: o Proxy não deve importar lib/auth.ts,
// pois isso traria cookies() (next/headers), fetch e outras dependências
// desnecessárias para uma checagem puramente otimista de presença de cookie.
const AUTH_COOKIE_NAME = "iguard_session";
const LOGIN_PATH = "/login";
const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function proxy(request: NextRequest) {
  if (DEMO_MODE_ENABLED) {
    return NextResponse.next();
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/equipamentos",
    "/equipamentos/:path*",
    "/incidentes",
    "/incidentes/:path*",
    "/notificacoes",
    "/notificacoes/:path*",
    "/alertas",
    "/alertas/:path*",
    "/clientes",
    "/clientes/:path*",
    "/faturamento",
    "/faturamento/:path*",
    "/master",
    "/master/:path*",
    "/central-ajuda",
    "/central-ajuda/:path*",
  ],
};
