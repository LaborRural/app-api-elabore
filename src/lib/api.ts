import "server-only";
import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { getToken } from "./session";
import { getProducerNames } from "./supabase";

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

// Páginas 2+ em paralelo, em lotes, para não sobrecarregar a API (cada página leva vários segundos).
const PAGE_CONCURRENCY = 4;

/** Percorre todas as páginas (size=100) de um endpoint paginado. */
export async function fetchAllPagesWithToken<T>(
  token: string,
  path: string,
  params?: QueryParams,
  maxPages = 50,
): Promise<{ items: T[]; total: number }> {
  const first = await apiGetWithToken<Page<T>>(token, path, { ...params, page: 1, size: 100 });
  const all: T[] = [...(first.items ?? first.data ?? [])];
  const pages = Math.min(first.pages ?? 1, maxPages);

  for (let start = 2; start <= pages; start += PAGE_CONCURRENCY) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(PAGE_CONCURRENCY, pages - start + 1) }, (_, i) =>
        apiGetWithToken<Page<T>>(token, path, { ...params, page: start + i, size: 100 }),
      ),
    );
    for (const res of batch) all.push(...(res.items ?? res.data ?? []));
  }

  return { items: all, total: first.total ?? all.length };
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
  /** Nome do produtor (vem das tabelas de indicadores, por código LR); ausente se a fazenda não tem indicadores. */
  producer_name?: string | null;
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

// Catálogos (propriedades e agroindústrias) mudam pouco e a API leva de 6 a 16 s por página:
// ficam em memória por usuário (chave = hash do token) e as páginas 2+ são pedidas em paralelo.
const CATALOG_TTL_MS = 10 * 60 * 1000;
// Lançamentos mudam com mais frequência: cache curto, só para trocas de ano/recargas seguidas.
const ENTRIES_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();
const memoryInFlight = new Map<string, Promise<unknown>>();

/** Cache em memória por usuário (chave = hash do token), com deduplicação de chamadas simultâneas. */
async function cachedLoad<T>(
  token: string,
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const fullKey = `${createHash("sha256").update(token).digest("hex")}|${key}`;
  const hit = memoryCache.get(fullKey);
  if (hit && Date.now() < hit.expiresAt) return hit.value as T;
  const pending = memoryInFlight.get(fullKey);
  if (pending) return (await pending) as T;

  const load = loader()
    .then((value) => {
      memoryCache.set(fullKey, { value, expiresAt: Date.now() + ttlMs });
      if (memoryCache.size > 400) {
        for (const [k, v] of memoryCache) if (Date.now() >= v.expiresAt) memoryCache.delete(k);
      }
      return value;
    })
    .finally(() => memoryInFlight.delete(fullKey));
  memoryInFlight.set(fullKey, load);
  return (await load) as T;
}

async function cachedCatalog<T>(token: string, path: string, maxPages: number): Promise<T[]> {
  return cachedLoad(token, path, CATALOG_TTL_MS, async () => {
    const { items } = await fetchAllPagesWithToken<T>(token, path, {}, maxPages);
    return items;
  });
}

/** Todas as páginas de um endpoint de lançamentos no período, com cache curto em memória. */
export async function getPeriodEntriesCached<T>(
  token: string,
  path: string,
  start: string,
  end: string,
  maxPages: number,
): Promise<{ items: T[]; total: number }> {
  return cachedLoad(token, `${path}?start=${start}&end=${end}&max=${maxPages}`, ENTRIES_TTL_MS, () =>
    fetchAllPagesWithToken<T>(token, path, { start, end }, maxPages),
  );
}

/** Contagem (campo total) de um endpoint paginado, com cache em memória. */
export async function getTotalCached(token: string, path: string): Promise<number> {
  return cachedLoad(token, `${path}#total`, CATALOG_TTL_MS, async () => {
    const res = await apiGetWithToken<Page<unknown>>(token, path, { page: 1, size: 1 });
    return res.total ?? 0;
  });
}

/**
 * Catálogo de propriedades com o motivo da falha (timeout, 5xx…) em vez de lista vazia silenciosa,
 * para a tela poder avisar que os nomes podem estar incompletos.
 */
export async function getPropertiesCatalogChecked(
  token?: string,
): Promise<{ items: PropertySummaryItem[]; error?: string }> {
  try {
    const [items, producers] = await Promise.all([
      token
        ? cachedCatalog<PropertySummaryItem>(token, "/properties", 50)
        : fetchAllPages<PropertySummaryItem>("/properties", {}, 50).then((r) => r.items),
      getProducerNames(),
    ]);
    return {
      items: items.map((p) => {
        const producer = p.labor_rural_code ? producers.get(p.labor_rural_code.trim().toUpperCase()) : undefined;
        return producer ? { ...p, producer_name: producer } : p;
      }),
    };
  } catch (err) {
    if (err instanceof ApiAuthError) throw err;
    return { items: [], error: err instanceof Error ? err.message : String(err) };
  }
}

/** Busca catálogo de propriedades para enriquecer nomes e popular filtro. */
export async function getPropertiesCatalog(token?: string): Promise<PropertySummaryItem[]> {
  return (await getPropertiesCatalogChecked(token)).items;
}

// Nomes de propriedades fora do catálogo, resolvidos por /property/{id} (null = não encontrada).
const propertyNameCache = new Map<string, { name: string | null; expiresAt: number }>();

/** Resolve nomes de propriedades que não estão no catálogo, consultando /property/{id}. */
export async function resolvePropertyNames(
  token: string,
  ids: string[],
): Promise<Map<string, string>> {
  const tokenKey = createHash("sha256").update(token).digest("hex");
  const found = new Map<string, string>();
  const toFetch: string[] = [];
  for (const id of ids) {
    const hit = propertyNameCache.get(`${tokenKey}|${id}`);
    if (hit && Date.now() < hit.expiresAt) {
      if (hit.name) found.set(id, hit.name);
    } else {
      toFetch.push(id);
    }
  }
  await Promise.all(
    toFetch.slice(0, 30).map(async (id) => {
      let name: string | null = null;
      try {
        const d = await apiGetWithToken<{ property_name?: string }>(token, `/property/${id}`);
        name = d.property_name ?? null;
      } catch (err) {
        if (err instanceof ApiAuthError) throw err;
      }
      propertyNameCache.set(`${tokenKey}|${id}`, { name, expiresAt: Date.now() + CATALOG_TTL_MS });
      if (name) found.set(id, name);
    }),
  );
  return found;
}

/** Busca catálogo de agroindústrias para popular filtro. */
export async function getAgroindustriesCatalog(token?: string): Promise<AgroindustryItem[]> {
  try {
    if (token) {
      return await cachedCatalog<AgroindustryItem>(token, "/agroindustry", 5);
    }
    const { items } = await fetchAllPages<AgroindustryItem>("/agroindustry", {}, 5);
    return items;
  } catch (err) {
    if (err instanceof ApiAuthError) throw err;
    return [];
  }
}
