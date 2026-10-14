import "server-only";
import { redirect } from "next/navigation";
import { getToken } from "./session";

export type Page<T> = { items?: T[]; data?: T[]; page?: number; pages?: number; total?: number };

export const apiBase = () => process.env.API_BASE_URL!.replace(/\/$/, "");

/** GET autenticado à API a partir de Server Components. 401 -> login. */
export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>) {
  const token = await getToken();
  if (!token) redirect("/login");
  const qs = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => v !== undefined && v !== "" && qs.set(k, String(v)));
  const res = await fetch(`${apiBase()}${path}${qs.size ? `?${qs}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) redirect("/login");
  if (!res.ok) throw new Error(`API ${res.status} em ${path}`);
  return (await res.json()) as T;
}
