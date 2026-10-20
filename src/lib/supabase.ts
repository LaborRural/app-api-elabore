import "server-only";

// Leitura somente das tabelas do Supabase (lr-analytics-db) via PostgREST.
// A chave fica só no servidor; o navegador nunca fala com o Supabase.

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;
const TTL_MS = 10 * 60 * 1000; // as tabelas raw só mudam quando o pipeline roda

const cache = new Map<string, { rows: Record<string, unknown>[]; expiresAt: number }>();
const inFlight = new Map<string, Promise<Record<string, unknown>[]>>();

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error(
      "Credenciais do Supabase ausentes: defina SUPABASE_URL e SUPABASE_SERVICE_KEY no .env.local",
    );
  }
  return { url, key };
}

async function fetchAll(table: string, order: string): Promise<Record<string, unknown>[]> {
  const { url, key } = supabaseConfig();
  const all: Record<string, unknown>[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const res = await fetch(`${url}/rest/v1/${table}?select=*&order=${order}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + PAGE_SIZE - 1}`,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Supabase ${res.status} em ${table}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
    }
    const batch = (await res.json()) as Record<string, unknown>[];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return all;
}

/** Lê a tabela inteira (paginando de 1000 em 1000) com cache em memória de 10 min. */
export async function getSupabaseTable(
  table: string,
  order: string,
): Promise<Record<string, unknown>[]> {
  const cacheKey = `${table}|${order}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() < hit.expiresAt) return hit.rows;

  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const read = fetchAll(table, order)
    .then((rows) => {
      cache.set(cacheKey, { rows, expiresAt: Date.now() + TTL_MS });
      return rows;
    })
    .finally(() => inFlight.delete(cacheKey));
  inFlight.set(cacheKey, read);
  return read;
}
