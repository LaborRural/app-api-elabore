import "server-only";
import type { PropertySummaryItem } from "./api";
import type { PainelData, PainelRow } from "./painel-mensal";
import type { ColumnType } from "./screens";
import { getElaboreColumns, queryElaboreAll } from "./supabase";

// Painel anual da fazenda (Indicadores Anuais): cada coluna é uma janela móvel de 12 meses,
// identificada pelo mês em que ela termina. Nenhuma fórmula é recalculada aqui: tudo vem de
// elabore.raw_indicadores_anuais, gravada pelo notebook do lr-indicadores-elabore. As janelas
// vizinhas compartilham 11 meses, então a comparação justa é com a janela 12 meses antes
// (sem meses em comum), e não com a janela anterior.

const TABLE = "raw_indicadores_anuais";
const CODE_COLUMN = "labor_rural_code";
const DEFAULT_WINDOWS = 12;
const NUMERIC_TYPES = new Set<ColumnType>(["number", "currency", "percent", "integer"]);
const NOT_AN_INDICATOR = /^(id_|has_|filter_)/;
const NOT_INDICATOR_GROUPS = new Set(["Identificação", "Consistência"]);
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type PainelAnualParams = { ano?: string; mes?: string; prop?: string };

export type PainelAnualData = PainelData & {
  /** Janela que termina 12 meses antes da última exibida: base da variação anual. */
  base: { label: string; values: Record<string, number | null> } | null;
};

/** "Apr/25-Mar/26" -> { key: "2026-03", label: "mar/26", title: "Abr/25–Mar/26" } (a janela é pelo mês final). */
function parseWindow(value: unknown): { key: string; label: string; title: string } | null {
  const m = /^([A-Za-z]{3})\/(\d{2})-([A-Za-z]{3})\/(\d{2})$/.exec(String(value ?? "").trim());
  if (!m) return null;
  const start = EN_MONTHS.indexOf(m[1].slice(0, 1).toUpperCase() + m[1].slice(1).toLowerCase());
  const end = EN_MONTHS.indexOf(m[3].slice(0, 1).toUpperCase() + m[3].slice(1).toLowerCase());
  if (start < 0 || end < 0) return null;
  const cap = (i: number, yy: string) => `${PT_MONTHS[i][0].toUpperCase()}${PT_MONTHS[i].slice(1)}/${yy}`;
  return {
    key: `20${m[4]}-${String(end + 1).padStart(2, "0")}`,
    label: `${PT_MONTHS[end]}/${m[4]}`,
    title: `${cap(start, m[2])}–${cap(end, m[4])}`,
  };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function plain(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "");
}

function shiftKey(key: string, deltaMonths: number): string {
  const [y, m] = key.split("-").map(Number);
  const t = y * 12 + (m - 1) + deltaMonths;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

export async function resolvePainelAnual(
  params: PainelAnualParams,
  properties: PropertySummaryItem[],
): Promise<PainelAnualData> {
  const empty = (notice: string, property: PropertySummaryItem | null = null): PainelAnualData => ({
    property,
    months: [],
    groups: [],
    series: {},
    base: null,
    notice,
  });

  const property =
    properties.find((p) => p.id_property === params.prop) ??
    (properties.length === 1 ? properties[0] : null);
  if (!property) return empty("Escolha uma fazenda no filtro para abrir o painel.");

  const columns = await getElaboreColumns(TABLE);
  if (columns.length === 0) {
    return empty(`A tabela elabore.${TABLE} ainda não foi carregada pelo notebook do lr-indicadores-elabore.`, property);
  }

  const code = property.labor_rural_code?.trim().toUpperCase();
  const propFilter: [string, string] = code
    ? [CODE_COLUMN, `eq.${plain(code)}`]
    : ["id_property", `eq.${plain(property.id_property)}`];
  const fetched = await queryElaboreAll({ table: TABLE, filters: [propFilter], order: "id.asc" });

  // A mesma fazenda pode vir com a janela repetida (regravação do notebook ou outra propriedade
  // com o mesmo código): fica só a linha da propriedade escolhida e, havendo repetição, a mais recente.
  const own = fetched.filter((r) => r.id_property === property.id_property);
  const byKey = new Map<string, { key: string; label: string; title: string; row: Record<string, unknown> }>();
  for (const row of own.length ? own : fetched) {
    const w = parseWindow(row.annual_period);
    if (w) byKey.set(w.key, { ...w, row });
  }
  const windows = [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));

  // Ano e Mês valem para o mês final da janela, como na tabela de médias.
  const year = params.ano && /^\d{4}$/.test(params.ano) ? params.ano : null;
  const selected = (params.mes ?? "")
    .split(",")
    .map((m) => Number(m.trim()))
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12);
  let kept = windows.filter(
    (w) => (!year || w.key.startsWith(year)) && (!selected.length || selected.includes(Number(w.key.slice(5)))),
  );
  if (!year && !selected.length) kept = kept.slice(-DEFAULT_WINDOWS);
  if (kept.length === 0) return empty("Esta fazenda não tem indicadores anuais para o período escolhido.", property);

  const baseWindow = windows.find((w) => w.key === shiftKey(kept[kept.length - 1].key, -12));

  const series: Record<string, (number | null)[]> = {};
  const baseValues: Record<string, number | null> = {};
  const groups: PainelData["groups"] = [];
  for (const col of columns) {
    const isAux = /^AUXILIAR/i.test(col.label);
    if (NOT_AN_INDICATOR.test(col.key) || isAux || NOT_INDICATOR_GROUPS.has(col.group) || !NUMERIC_TYPES.has(col.type ?? "text")) continue;
    const values = kept.map((w) => toNumber(w.row[col.key]));
    series[col.key] = values;
    baseValues[col.key] = baseWindow ? toNumber(baseWindow.row[col.key]) : null;
    if (values.every((v) => v === null)) continue;
    let group = groups.find((g) => g.name === col.group);
    if (!group) groups.push((group = { name: col.group, rows: [] }));
    const last = values[values.length - 1];
    const row: PainelRow = { key: col.key, label: col.label, type: col.type ?? "number", values, average: last };
    group.rows.push(row);
  }

  return {
    property,
    months: kept.map((w) => ({
      key: w.key,
      label: w.label,
      title: w.title,
      status: typeof w.row.annual_consistency_status === "string" ? w.row.annual_consistency_status : null,
    })),
    groups,
    series,
    base: baseWindow ? { label: baseWindow.label, values: baseValues } : null,
  };
}
