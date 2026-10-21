import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "elabore_token";
// Marca o login da equipe Labor Rural (pode baixar as planilhas completas). O valor é um
// HMAC do token da sessão: não serve para outro token e não pode ser montado no navegador.
const INTERNAL_COOKIE = "elabore_interno";
// Dados só para exibição no cabeçalho (nome/e-mail); não concedem acesso.
const USER_COOKIE = "elabore_usuario";
const MAX_AGE = 60 * 60; // JWT da API dura 1h

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

function internalSignature(token: string): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(`interno|${token}`).digest("hex");
}

/**
 * E-mail da equipe Labor Rural? Lista em EMAILS_EQUIPE_LR (separada por vírgula);
 * itens começando com "@" liberam o domínio inteiro (ex.: "@laborrural.com").
 */
export function isInternalEmail(email: string): boolean {
  const alvo = email.trim().toLowerCase();
  return (process.env.EMAILS_EQUIPE_LR ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .some((e) => (e.startsWith("@") ? alvo.endsWith(e) : alvo === e));
}

export async function setSession(
  token: string,
  internal = false,
  user?: { email?: string; name?: string },
) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions);
  const signature = internal ? internalSignature(token) : null;
  if (signature) store.set(INTERNAL_COOKIE, signature, cookieOptions);
  else store.delete(INTERNAL_COOKIE);
  if (user?.email || user?.name) {
    store.set(USER_COOKIE, encodeURIComponent(JSON.stringify(user)), cookieOptions);
  } else store.delete(USER_COOKIE);
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(INTERNAL_COOKIE);
  store.delete(USER_COOKIE);
}

export async function getToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** A sessão atual é da equipe Labor Rural? */
export async function isInternalSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const value = store.get(INTERNAL_COOKIE)?.value;
  const expected = token ? internalSignature(token) : null;
  if (!value || !expected || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export type SessionUser = { nome: string; iniciais: string; papel: string };

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

/** Usuário logado para exibição: nome da API ou, na falta dele, derivado do e-mail. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(USER_COOKIE)?.value;
  if (!raw || !store.get(SESSION_COOKIE)?.value) return null;
  let data: { email?: string; name?: string } = {};
  try {
    data = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
  const nome =
    data.name?.trim() ||
    (data.email ?? "")
      .split("@")[0]
      .split(/[._-]+/)
      .filter(Boolean)
      .map(capitalizar)
      .join(" ");
  if (!nome) return null;
  const partes = nome.split(/\s+/);
  const iniciais = (
    partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : partes[0].slice(0, 2)
  ).toUpperCase();
  const papel = (await isInternalSession()) ? "Supervisor(a) da Labor Rural" : "Consultor";
  return { nome: partes[0], iniciais, papel };
}
