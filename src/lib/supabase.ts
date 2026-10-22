import "server-only";
import type { ColumnDef, ColumnType } from "./screens";

// Leitura somente do schema "elabore" do Supabase (lr-analytics-db) via PostgREST.
// As tabelas são gravadas pelo notebook do lr-indicadores-elabore (functions/supabase_utils.py).
// A chave fica só no servidor; o navegador nunca fala com o Supabase.

const SCHEMA = "elabore";
const PAGE_SIZE = 1000;
const MAX_EXPORT_PAGES = 50;
const CATALOG_TTL_MS = 10 * 60 * 1000; // dicionário e tipos só mudam quando o notebook roda

/** Colunas de status de consistência: viram selo colorido na tabela. */
const CONSISTENCY_COLUMNS = new Set([
  "consistency_status",
  "annual_consistency_status",
  "monthly_status_annual",
]);

export type ElaboreColumn = ColumnDef & { group: string };

export type ElaboreQuery = {
  table: string;
  /** Pares [coluna, expressão PostgREST], ex.: ["labor_rural_code", "in.(LR1,LR2)"]. */
  filters: [string, string][];
  order: string;
  offset: number;
  limit: number;
};

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

async function elaboreFetch(path: string, headers: Record<string, string> = {}) {
  const { url, key } = supabaseConfig();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Accept-Profile": SCHEMA, ...headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Supabase ${res.status} em ${SCHEMA}.${path.split("?")[0]}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }
  return res;
}

// ------------------------------------------------------------------------------
// Produtor de cada fazenda: a API de propriedades só traz id_entrepreneur, mas as tabelas de
// indicadores já trazem o rótulo "FAZENDA - Produtor" (property_entrepreneur_label) por código LR.
// ------------------------------------------------------------------------------
const PRODUCER_TTL_MS = 10 * 60 * 1000;
let producerCache: { byCode: Map<string, string>; expiresAt: number } | null = null;
let producerInFlight: Promise<Map<string, string>> | null = null;

async function loadProducers(): Promise<Map<string, string>> {
  const byCode = new Map<string, string>();
  for (let page = 0; page < 30; page++) {
    const res = await elaboreFetch(
      `raw_indicadores_mensais?select=labor_rural_code,property_entrepreneur_label&order=reference_month.desc,id.asc&offset=${page * PAGE_SIZE}&limit=${PAGE_SIZE}`,
    );
    const batch = (await res.json()) as { labor_rural_code: string | null; property_entrepreneur_label: string | null }[];
    for (const r of batch) {
      const code = r.labor_rural_code?.trim().toUpperCase();
      const label = r.property_entrepreneur_label ?? "";
      const cut = label.lastIndexOf(" - ");
      // Rótulo mais recente de cada código; o produtor é o que vem depois do último " - "
      if (code && cut > 0 && !byCode.has(code)) byCode.set(code, label.slice(cut + 3).trim());
    }
    if (batch.length < PAGE_SIZE) break;
  }
  return byCode;
}

/** Código LR (maiúsculo) -> nome do produtor. Vazio se o Supabase não responder. */
export async function getProducerNames(): Promise<Map<string, string>> {
  if (producerCache && Date.now() < producerCache.expiresAt) return producerCache.byCode;
  if (!producerInFlight) {
    producerInFlight = loadProducers()
      .then((byCode) => {
        producerCache = { byCode, expiresAt: Date.now() + PRODUCER_TTL_MS };
        return byCode;
      })
      .catch(() => new Map<string, string>())
      .finally(() => {
        producerInFlight = null;
      });
  }
  return producerInFlight;
}

// ------------------------------------------------------------------------------
// Catálogo de colunas: dicionário (rótulo, ordem, grupo) + tipo do Postgres (OpenAPI)
// ------------------------------------------------------------------------------
let catalogCache: { byTable: Map<string, ElaboreColumn[]>; expiresAt: number } | null = null;
let catalogInFlight: Promise<Map<string, ElaboreColumn[]>> | null = null;

function columnType(column: string, label: string, pgFormat: string | undefined): ColumnType {
  if (CONSISTENCY_COLUMNS.has(column)) return "consistencia";
  if (column === "violated_consistency_criteria" || /^detalhamento/i.test(label)) return "inconsistencia";
  if (pgFormat === "boolean") return "boolean";
  if (pgFormat?.startsWith("timestamp") || pgFormat === "date") {
    return column === "reference_month" ? "month" : "date";
  }
  if (pgFormat === "double precision" || pgFormat === "numeric" || pgFormat === "integer") {
    if (/R\$/.test(label)) return "currency";
    if (/\(%|%\)|\(% /.test(label)) return "percent";
    return "number";
  }
  return "text";
}

async function loadCatalog(): Promise<Map<string, ElaboreColumn[]>> {
  const [dictRes, specRes] = await Promise.all([
    elaboreFetch("dim_dicionario_colunas?select=tabela,coluna,rotulo,ordem,grupo&order=tabela.asc,ordem.asc"),
    elaboreFetch(""),
  ]);
  const dict = (await dictRes.json()) as {
    tabela: string;
    coluna: string;
    rotulo: string;
    ordem: number;
    grupo: string | null;
  }[];
  const spec = (await specRes.json()) as {
    definitions?: Record<string, { properties?: Record<string, { format?: string }> }>;
  };

  const byTable = new Map<string, ElaboreColumn[]>();
  for (const d of dict) {
    const pgFormat = spec.definitions?.[d.tabela]?.properties?.[d.coluna]?.format;
    const type = columnType(d.coluna, d.rotulo, pgFormat);
    const list = byTable.get(d.tabela) ?? [];
    list.push({
      key: d.coluna,
      label: d.rotulo,
      type,
      align:
        type === "currency" || type === "number" || type === "percent"
          ? "right"
          : type === "text" || type === "inconsistencia"
            ? "left"
            : "center",
      group: d.grupo ?? "Outros",
    });
    byTable.set(d.tabela, list);
  }
  return byTable;
}

/** Colunas da tabela na ordem da aba do Excel, com rótulo, tipo e grupo. */
export async function getElaboreColumns(table: string): Promise<ElaboreColumn[]> {
  if (catalogCache && Date.now() < catalogCache.expiresAt) {
    return catalogCache.byTable.get(table) ?? [];
  }
  if (!catalogInFlight) {
    catalogInFlight = loadCatalog()
      .then((byTable) => {
        catalogCache = { byTable, expiresAt: Date.now() + CATALOG_TTL_MS };
        return byTable;
      })
      .finally(() => {
        catalogInFlight = null;
      });
  }
  return (await catalogInFlight).get(table) ?? [];
}

// ------------------------------------------------------------------------------
// Consulta filtrada e paginada no banco
// ------------------------------------------------------------------------------
function buildPath(q: Omit<ElaboreQuery, "offset" | "limit">, offset: number, limit: number) {
  const sp = new URLSearchParams();
  sp.set("select", "*");
  for (const [col, expr] of q.filters) sp.append(col, expr);
  sp.set("order", q.order);
  sp.set("offset", String(offset));
  sp.set("limit", String(limit));
  return `${q.table}?${sp.toString()}`;
}

/** Uma página de linhas + total que atende aos filtros (Prefer: count=exact). */
export async function queryElabore(
  q: ElaboreQuery,
): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const res = await elaboreFetch(buildPath(q, q.offset, q.limit), { Prefer: "count=exact" });
  const rows = (await res.json()) as Record<string, unknown>[];
  const range = res.headers.get("Content-Range") ?? "";
  const total = Number(range.split("/")[1]);
  return { rows, total: Number.isFinite(total) ? total : rows.length };
}

/** Todas as linhas que atendem aos filtros (exportação), de 1000 em 1000. */
export async function queryElaboreAll(
  q: Omit<ElaboreQuery, "offset" | "limit">,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  for (let page = 0; page < MAX_EXPORT_PAGES; page++) {
    const res = await elaboreFetch(buildPath(q, page * PAGE_SIZE, PAGE_SIZE));
    const batch = (await res.json()) as Record<string, unknown>[];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return all;
}
