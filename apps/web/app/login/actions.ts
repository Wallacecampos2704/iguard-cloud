"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  API_URL,
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  extractSessionCookieValue,
  type LoginActionState,
} from "@/lib/auth";

const GENERIC_ERROR_MESSAGE = "E-mail ou senha inválidos.";
const NETWORK_ERROR_MESSAGE =
  "Não foi possível entrar agora. Tente novamente em instantes.";

export async function login(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const emailRaw = formData.get("email");
  const passwordRaw = formData.get("password");

  const email =
    typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : "";
  const password = typeof passwordRaw === "string" ? passwordRaw : "";

  if (!email || !password) {
    return { success: false, message: GENERIC_ERROR_MESSAGE };
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
  } catch {
    return { success: false, message: NETWORK_ERROR_MESSAGE };
  }

  if (!response.ok) {
    return { success: false, message: GENERIC_ERROR_MESSAGE };
  }

  const sessionToken = extractSessionCookieValue(
    response.headers.get("set-cookie"),
  );

  if (!sessionToken) {
    return { success: false, message: NETWORK_ERROR_MESSAGE };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
  });

  redirect("/dashboard");
}
