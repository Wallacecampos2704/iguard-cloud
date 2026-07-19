"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        cache: "no-store",
        headers: {
          Cookie: `${AUTH_COOKIE_NAME}=${token}`,
        },
      });
    } catch {
      // O logout local deve ocorrer mesmo se a API estiver indisponível.
    }
  }

  cookieStore.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  redirect("/login");
}
