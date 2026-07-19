// O pacote "server-only" não está instalado neste projeto; a proteção contra
// uso em Client Components já vem de `cookies()` (next/headers) e de
// `API_URL` não ter prefixo NEXT_PUBLIC_, ambos inutilizáveis no browser.
import { cookies } from "next/headers.js";

export const API_URL = process.env.API_URL ?? "http://localhost:4000";
export const AUTH_COOKIE_NAME = "iguard_session";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type UserRole = "MASTER" | "ADMIN" | "OPERATOR" | "VIEWER";

export type AuthenticatedUser = {
  id: string;
  organizationId: string | null;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  lastLoginAt: string | null;
};

export type LoginActionState = {
  success: boolean;
  message: string;
};

const USER_ROLES: readonly UserRole[] = [
  "MASTER",
  "ADMIN",
  "OPERATOR",
  "VIEWER",
];

function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (USER_ROLES as readonly string[]).includes(value)
  );
}

function toAuthenticatedUser(value: unknown): AuthenticatedUser | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.email !== "string" ||
    typeof candidate.name !== "string" ||
    typeof candidate.active !== "boolean" ||
    !isUserRole(candidate.role)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    organizationId:
      typeof candidate.organizationId === "string"
        ? candidate.organizationId
        : null,
    email: candidate.email,
    name: candidate.name,
    role: candidate.role,
    active: candidate.active,
    lastLoginAt:
      typeof candidate.lastLoginAt === "string" ? candidate.lastLoginAt : null,
  };
}

/**
 * Extrai somente o valor do cookie iguard_session a partir de um header
 * Set-Cookie bruto. Função pura: não decodifica, não interpreta e não
 * registra o token; devolve null para qualquer entrada ausente, vazia,
 * malformada ou de outro cookie.
 */
export function extractSessionCookieValue(
  setCookieHeader: string | null,
): string | null {
  if (!setCookieHeader) {
    return null;
  }

  const firstSegment = setCookieHeader.split(";")[0]?.trim();
  if (!firstSegment) {
    return null;
  }

  const separatorIndex = firstSegment.indexOf("=");
  if (separatorIndex === -1) {
    return null;
  }

  const name = firstSegment.slice(0, separatorIndex).trim();
  const value = firstSegment.slice(separatorIndex + 1).trim();

  if (name !== AUTH_COOKIE_NAME || value.length === 0) {
    return null;
  }

  return value;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      cache: "no-store",
      headers: {
        Cookie: `${AUTH_COOKIE_NAME}=${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { user?: unknown };
    return toAuthenticatedUser(payload.user);
  } catch {
    return null;
  }
}
