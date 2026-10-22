import "server-only";
import type { PropertySummaryItem } from "./api";
import type { ColumnType } from "./screens";
import { getElaboreColumns, queryElaboreAll } from "./supabase";

// Painel da fazenda (Indicadores Mensais): meses nas colunas, indicadores nas linhas.
// Nenhuma fórmula é recalculada aqui: tudo vem de elabore.raw_indicadores_mensais, gravada pelo
// notebook do lr-indicadores-elabore. O escopo segue o catálogo de propriedades da API, como
// nas telas de tabela: a fazenda só é aceita se estiver na lista liberada ao usuário logado.

const TABLE = "raw_indicadores_mensais";
const CODE_COLUMN = "labor_rural_code";
const DEFAULT_MONTHS = 12;
const NUMERIC_TYPES = new Set<ColumnType>(["number", "currency", "percent", "integer"]);
const NOT_AN_INDICATOR = /^(id_|has_|cons_|total_consistency)/;
// Grupos do dicionário que descrevem a linha ou os critérios de consistência, não indicadores.
const NOT_INDICATOR_GROUPS = new Set(["Identificação", "Consistência"]);

export type PainelParams = { ano?: string; mes?: string; prop?: string };

export type PainelMonth = { key: string; label: string; status: string | null; /** Texto completo ao passar o mouse (ex.: janela anual "Abr/25-Mar/26"). */ title?: string };

export type PainelRow = {
  key: string;
  label: string;
  type: ColumnType;
  values: (number | null)[];
  average: number | null;
};

export type PainelData = {
  /** Fazenda exibida; null quando falta escolher uma. */
  property: PropertySummaryItem | null;
  months: PainelMonth[];
  groups: { name: string; rows: PainelRow[] }[];
  /** Série mensal de qualquer indicador numérico, para KPIs e gráficos. */
  series: Record<string, (number | null)[]>;
  /** Mensagem quando não há o que mostrar. */
  notice?: string;
};

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-03-01T00:00:00" -> { key: "2026-03", label: "mar/26" } sem passar por fuso horário. */
function parseMonth(value: unknown): { key: string; label: string } | null {
  const m = /^(\d{4})-(\d{2})/.exec(String(value ?? ""));
  if (!m) return null;
  return { key: `${m[1]}-${m[2]}`, label: `${MONTH_NAMES[Number(m[2]) - 1]}/${m[1].slice(2)}` };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mean(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

/** Código LR seguro em eq.<valor> do PostgREST: aqui as aspas fariam parte do valor, então só se removem caracteres especiais. */
function plain(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "");
}

export async function resolvePainelMensal(
  params: PainelParams,
  properties: PropertySummaryItem[],
): Promise<PainelData> {
  const empty = (notice: string, property: PropertySummaryItem | null = null): PainelData => ({
    property,
    months: [],
    groups: [],
    series: {},
    notice,
  });

  // Fazenda: a escolhida no filtro ou, se o usuário só enxerga uma, essa.
  const property =
    properties.find((p) => p.id_property === params.prop) ??
    (properties.length === 1 ? properties[0] : null);
  if (!property) {
    return empty("Escolha uma fazenda no filtro para abrir o painel.");
  }

  const columns = await getElaboreColumns(TABLE);
  if (columns.length === 0) {
    return empty(`A tabela elabore.${TABLE} ainda não foi carregada pelo notebook do lr-indicadores-elabore.`, property);
  }

  const code = property.labor_rural_code?.trim().toUpperCase();
  const filters: [string, string][] = code
    ? [[CODE_COLUMN, `eq.${plain(code)}`]]
    : [["id_property", `eq.${plain(property.id_property)}`]];
  const year = params.ano && /^\d{4}$/.test(params.ano) ? Number(params.ano) : null;
  if (year) filters.push(["reference_month", `gte.${year}-01-01`], ["reference_month", `lt.${year + 1}-01-01`]);

  let rows = await queryElaboreAll({ table: TABLE, filters, order: "reference_month.asc" });

  const selected = (params.mes ?? "")
    .split(",")
    .map((m) => Number(m.trim()))
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12);
  if (selected.length) {
    rows = rows.filter((r) => {
      const m = parseMonth(r.reference_month);
      return m ? selected.includes(Number(m.key.slice(5))) : false;
    });
  } else if (!year) {
    rows = rows.slice(-DEFAULT_MONTHS); // sem filtro: últimos 12 meses com dados
  }

  const months: PainelMonth[] = [];
  const kept: Record<string, unknown>[] = [];
  for (const row of rows) {
    const m = parseMonth(row.reference_month);
    if (!m) continue;
    months.push({ ...m, status: typeof row.consistency_status === "string" ? row.consistency_status : null });
    kept.push(row);
  }
  if (kept.length === 0) {
    return empty("Esta fazenda não tem indicadores mensais para o período escolhido.", property);
  }

  const series: Record<string, (number | null)[]> = {};
  const groups: PainelData["groups"] = [];
  for (const col of columns) {
    if (NOT_AN_INDICATOR.test(col.key) || NOT_INDICATOR_GROUPS.has(col.group) || !NUMERIC_TYPES.has(col.type ?? "text")) continue;
    const values = kept.map((r) => toNumber(r[col.key]));
    series[col.key] = values;
    if (values.every((v) => v === null)) continue; // indicador sem nenhum valor no período
    let group = groups.find((g) => g.name === col.group);
    if (!group) groups.push((group = { name: col.group, rows: [] }));
    group.rows.push({ key: col.key, label: col.label, type: col.type ?? "number", values, average: mean(values) });
  }

  return { property, months, groups, series };
}
