import "server-only";
import { redirect } from "next/navigation";
import { getToken } from "./session";

export type Page<T> = {
  items?: T[];
  data?: T[];
  page?: number;
  size?: number;
  pages?: number;
  total?: number;
};

export class ApiAuthError extends Error {
  constructor() {
    super("Sessão expirada ou não autenticada");
    this.name = "ApiAuthError";
  }
}

export const apiBase = () =>
  (process.env.API_BASE_URL ?? "https://torta.tec.br/laborrural").replace(/\/$/, "");

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

function buildQuery(params?: QueryParams): string {
  const qs = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      qs.set(k, String(v));
    }
  });
  return qs.size ? `?${qs.toString()}` : "";
}

/** GET autenticado usando token explícito (ideal para Route Handlers como /api/export). */
export async function apiGetWithToken<T>(
  token: string,
  path: string,
  params?: QueryParams,
): Promise<T> {
  const url = `${apiBase()}${path}${buildQuery(params)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 401) {
    throw new ApiAuthError();
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`API ${res.status} em ${path}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }
  return (await res.json()) as T;
}

/** GET autenticado à API a partir de Server Components. 401 -> /login?expired=1. */
export async function apiGet<T>(path: string, params?: QueryParams): Promise<T> {
  const token = await getToken();
  if (!token) redirect("/login?expired=1");
  try {
    return await apiGetWithToken<T>(token, path, params);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      redirect("/login?expired=1");
    }
    throw err;
  }
}

/** Percorre todas as páginas (size=100) de um endpoint paginado. */
export async function fetchAllPagesWithToken<T>(
  token: string,
  path: string,
  params?: QueryParams,
  maxPages = 50,
): Promise<{ items: T[]; total: number }> {
  const all: T[] = [];
  let page = 1;
  let total = 0;

  while (page <= maxPages) {
    const res = await apiGetWithToken<Page<T>>(token, path, {
      ...params,
      page,
      size: 100,
    });
    const batch = res.items ?? res.data ?? [];
    all.push(...batch);
    total = res.total ?? all.length;
    const pages = res.pages ?? 1;
    if (page >= pages || batch.length === 0) break;
    page += 1;
  }

  return { items: all, total };
}

export async function fetchAllPages<T>(
  path: string,
  params?: QueryParams,
  maxPages = 50,
): Promise<{ items: T[]; total: number }> {
  const token = await getToken();
  if (!token) redirect("/login?expired=1");
  try {
    return await fetchAllPagesWithToken<T>(token, path, params, maxPages);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      redirect("/login?expired=1");
    }
    throw err;
  }
}

export type PropertySummaryItem = {
  id_property: string;
  property_name: string;
  legal_name: string | null;
  cnpj: string | null;
  id_agroindustry: string | null;
  id_entrepreneur: string | null;
  city: string | null;
  uf: string | null;
  is_active: boolean;
  is_approved: boolean;
  labor_rural_code: string | null;
  agroindustry_code: string | null;
};

export type AgroindustryItem = {
  id_agroindustry: string;
  name: string;
  cnpj: string;
  razao_social: string;
  industry: string;
  cep: string | null;
  uf: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
};

/** Busca catálogo de propriedades para enriquecer nomes e popular filtro. */
export async function getPropertiesCatalog(token?: string): Promise<PropertySummaryItem[]> {
  try {
    if (token) {
      const { items } = await fetchAllPagesWithToken<PropertySummaryItem>(token, "/properties", {}, 10);
      return items;
    }
    const { items } = await fetchAllPages<PropertySummaryItem>("/properties", {}, 10);
    return items;
  } catch (err) {
    if (err instanceof ApiAuthError) throw err;
    return [];
  }
}

/** Busca catálogo de agroindústrias para popular filtro. */
export async function getAgroindustriesCatalog(token?: string): Promise<AgroindustryItem[]> {
  try {
    if (token) {
      const { items } = await fetchAllPagesWithToken<AgroindustryItem>(token, "/agroindustry", {}, 5);
      return items;
    }
    const { items } = await fetchAllPages<AgroindustryItem>("/agroindustry", {}, 5);
    return items;
  } catch (err) {
    if (err instanceof ApiAuthError) throw err;
    return [];
  }
}
