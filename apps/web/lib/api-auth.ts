// Módulo exclusivamente server-side: depende de cookies() (next/headers) e
// nunca deve ser importado por um Client Component.
import { cookies } from "next/headers.js";

// Constantes duplicadas de lib/auth.ts (mesmos valores), em vez de importadas
// de "@/lib/auth": nem o alias "@/" nem um import relativo (com ou sem
// extensão ".ts") resolvem simultaneamente sob o `tsc`/bundler do Next e sob
// `node --test` fora do bundler — mesmo conflito de resolução ESM já
// registrado em lib/auth.ts para "next/navigation" e "./demo-mode".
const API_URL = process.env.API_URL ?? "http://localhost:4000";
const AUTH_COOKIE_NAME = "iguard_session";

export type AuthenticatedApiFetchResult =
  | { ok: true; response: Response }
  | { ok: false; reason: "no-session" };

/**
 * Resolve a URL final de forma segura: `path` nunca pode substituir o
 * hostname, protocolo ou porta configurados em `apiUrl` — a concatenação é
 * feita por string, nunca via `new URL(path, base)`, que reinterpretaria um
 * `path` absoluto ou protocol-relative como um destino diferente.
 */
export function resolveAuthenticatedApiUrl(
  apiUrl: string,
  path: string,
): string {
  if (!path) {
    throw new TypeError("Caminho de API inválido.");
  }
  if (!path.startsWith("/")) {
    throw new TypeError("Caminho de API inválido.");
  }
  if (path.startsWith("//")) {
    throw new TypeError("Caminho de API inválido.");
  }
  if (/^https?:\/\//i.test(path)) {
    throw new TypeError("Caminho de API inválido.");
  }

  const normalizedApiUrl = apiUrl.replace(/\/+$/, "");
  return `${normalizedApiUrl}${path}`;
}

/**
 * Constrói os headers de saída com o cookie de sessão. Sempre cria uma nova
 * instância de `Headers` (nunca muta o `Headers`/objeto recebido) e define o
 * Cookie por último, garantindo que o caller não consiga sobrescrevê-lo.
 */
export function buildAuthenticatedHeaders(
  inputHeaders: HeadersInit | undefined,
  token: string,
): Headers {
  if (!token) {
    throw new TypeError("Token de sessão inválido.");
  }

  const headers = new Headers(inputHeaders);
  headers.set("Cookie", `${AUTH_COOKIE_NAME}=${token}`);

  return headers;
}

export async function authenticatedApiFetch(
  path: `/${string}`,
  init: RequestInit = {},
): Promise<AuthenticatedApiFetchResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return { ok: false, reason: "no-session" };
  }

  const url = resolveAuthenticatedApiUrl(API_URL, path);
  const headers = buildAuthenticatedHeaders(init.headers, token);

  const response = await fetch(url, {
    ...init,
    headers,
    cache: init.cache ?? "no-store",
  });

  return { ok: true, response };
}
