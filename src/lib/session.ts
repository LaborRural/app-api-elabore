import "server-only";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "elabore_token";
const MAX_AGE = 60 * 60; // JWT da API dura 1h

export async function setSession(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}
