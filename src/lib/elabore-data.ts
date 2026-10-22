import "server-only";
import type { AgroindustryItem, PropertySummaryItem } from "./api";
import type { ResolvedScreenData, ScreenFilterParams } from "./screen-data";
import type { ColumnDef, ElaboreSourceDef, ScreenDef, ScreenTabDef } from "./screens";
import { resolveElaboreScope } from "./elabore-scope";
import { isInternalSession } from "./session";
import { getElaboreColumns, queryElabore, queryElaboreAll, type ElaboreColumn } from "./supabase";

// Telas de Indicadores: schema "elabore" do Supabase, filtrado e paginado no banco.
// Só entram fazendas cujo código (labor_rural_code) está no catálogo de propriedades
// que a API Elabore devolve para o usuário logado: cada agroindústria continua vendo
// apenas as próprias fazendas, mesmo que manipule os filtros da URL.
// Para sessões internas da equipe Labor Rural sem
// filtro de Propriedade/Agroindústria ativo, a consulta traz 100% da tabela no Supabase,
// incluindo registros sem labor_rural_code ou com códigos históricos fora de /properties.

// annual_period vem do notebook no formato "Apr/25-Mar/26" (mês em inglês).
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FIRST_YEAR = 2018;

function slug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Valor seguro dentro de in.(...) / or=(...) do PostgREST; evita aspas quando é código simples. */
function quote(value: string): string {
  const clean = value.replace(/["\\]/g, "");
  return /^[A-Za-z0-9_-]+$/.test(clean) ? clean : `"${clean}"`;
}

function parseMonths(mes?: string): number[] {
  return (mes ?? "")
    .split(",")
    .map((m) => Number(m.trim()))
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)
    .sort((a, b) => a - b);
}

// Chaves técnicas (UUID do Elabore: id_property, id_production, id_planted_culture) não vão
// para a tela nem para o download de planilhas.
const HIDDEN_UUID_COLUMNS = /^id_/i;

/** Abas de colunas a partir dos grupos do dicionário; colunas fixas aparecem em todas. */
function buildTabs(allColumns: ElaboreColumn[], fixedKeys: string[], codeColumn: string): ScreenTabDef[] {
  const columns = allColumns.filter((c) => !HIDDEN_UUID_COLUMNS.test(c.key));
  const fixed = fixedKeys
    .map((k) => columns.find((c) => c.key === k))
    .filter((c): c is ElaboreColumn => Boolean(c));
  const groups: string[] = [];
  for (const c of columns) if (!groups.includes(c.group)) groups.push(c.group);

  return groups.map((group) => {
    const own = columns.filter((c) => c.group === group);
    const cols: ElaboreColumn[] =
      group === "Identificação"
        ? own
        : [...fixed, ...own.filter((c) => !fixedKeys.includes(c.key))];
    return { id: slug(group), label: group, endpoint: "", columns: codeFirst(cols, codeColumn).map(stripGroup) };
  });
}

/** Código LR sempre como primeira coluna, independente da ordem do dicionário. */
function codeFirst<T extends { key: string }>(columns: T[], codeColumn: string): T[] {
  const code = columns.find((c) => c.key === codeColumn);
  return code ? [code, ...columns.filter((c) => c !== code)] : columns;
}

function stripGroup(column: ElaboreColumn): ColumnDef {
  const { group, ...col } = column;
  void group;
  return col;
}

export async function resolveElaboreScreen(
  screen: ScreenDef,
  source: ElaboreSourceDef,
  rawParams: ScreenFilterParams,
  properties: PropertySummaryItem[],
  agroindustries: AgroindustryItem[],
  options: { forExport: boolean; page: number; size: number },
): Promise<ResolvedScreenData> {
  const allColumns = codeFirst(await getElaboreColumns(source.table), source.codeColumn);
  const tabs = buildTabs(allColumns, source.fixedColumns, source.codeColumn);
  const activeTab = tabs.find((t) => t.id === rawParams.aba) ?? tabs[0];
  const screenWithTabs: ScreenDef = { ...screen, tabs };
  const visibleColumns = allColumns.filter((c) => !HIDDEN_UUID_COLUMNS.test(c.key));
  const columns = options.forExport ? visibleColumns.map(stripGroup) : (activeTab?.columns ?? []);

  const empty = (notice?: string): ResolvedScreenData => ({
    screen: screenWithTabs,
    activeTabId: activeTab?.id,
    columns,
    rows: [],
    total: 0,
    page: 1,
    size: options.size,
    pages: 1,
    properties,
    agroindustries,
    notice: notice ?? screen.notice,
  });

  if (allColumns.length === 0) {
    return empty(`A tabela elabore.${source.table} ainda não foi carregada pelo notebook do lr-indicadores-elabore.`);
  }

  // Escopo: só a equipe interna sem filtro de Propriedade/Agroindústria consulta a base completa
  // (incluindo registros sem código LR). Os demais veem só as fazendas do próprio /properties.
  const scope = resolveElaboreScope(properties, {
    internal: await isInternalSession(),
    prop: rawParams.prop,
    agro: rawParams.agro,
    hasIdPropertyColumn: allColumns.some((c) => c.key === "id_property"),
  });

  const filters: [string, string][] = [];
  if (scope.kind === "empty") return empty();
  if (scope.kind === "codes") filters.push([source.codeColumn, `in.(${scope.codes.map(quote).join(",")})`]);
  else if (scope.kind === "property") filters.push(["id_property", `eq.${quote(scope.idProperty)}`]);
  const orGroups: string[] = [];

  // Período (Ano / Mês)
  const year = rawParams.ano && /^\d{4}$/.test(rawParams.ano) ? Number(rawParams.ano) : null;
  const months = parseMonths(rawParams.mes);
  if (source.period && (year || months.length > 0)) {
    const col = source.period.column;
    if (source.period.kind === "month") {
      if (year && months.length === 0) {
        filters.push([col, `gte.${year}-01-01`], [col, `lt.${year + 1}-01-01`]);
      } else {
        const years = year
          ? [year]
          : Array.from({ length: new Date().getFullYear() + 2 - FIRST_YEAR }, (_, i) => FIRST_YEAR + i);
        const values = years.flatMap((y) =>
          months.map((m) => `${y}-${String(m).padStart(2, "0")}-01T00:00:00`),
        );
        filters.push([col, `in.(${values.join(",")})`]);
      }
    } else {
      // Janela "Abr/25-Mar/26": Ano e Mês valem para o último mês da janela
      const yy = year ? String(year).slice(-2) : "*";
      const patterns = (months.length ? months : [0]).map((m) =>
        m ? `${col}.like.*-${MONTH_ABBR[m - 1]}/${yy}` : `${col}.like.*/${yy}`,
      );
      if (patterns.length === 1) filters.push([col, patterns[0].slice(col.length + 1)]);
      else orGroups.push(`or(${patterns.join(",")})`);
    }
  }

  // Consistência
  if (source.consistencyColumn && rawParams.consistencia) {
    filters.push([source.consistencyColumn, `ilike.${rawParams.consistencia.replace(/[^A-Za-z]/g, "")}`]);
  }

  // Busca de texto
  const q = (rawParams.q ?? "").replace(/[,()*"\\:]/g, " ").trim();
  if (q) {
    orGroups.push(`or(${source.searchColumns.map((c) => `${c}.ilike.*${q}*`).join(",")})`);
  }
  if (orGroups.length === 1) filters.push(["or", orGroups[0].slice(2)]);
  else if (orGroups.length > 1) filters.push(["and", `(${orGroups.join(",")})`]);

  // Ordenação: só por coluna conhecida do dicionário
  const sortKey = rawParams.sort && allColumns.some((c) => c.key === rawParams.sort) ? rawParams.sort : null;
  const order = sortKey
    ? `${sortKey}.${rawParams.dir === "desc" ? "desc" : "asc"}.nullslast,${source.order}`
    : source.order;

  if (options.forExport) {
    const rows = await queryElaboreAll({ table: source.table, filters, order });
    return {
      ...empty(),
      rows,
      total: rows.length,
      size: rows.length || 1,
    };
  }

  const offset = (options.page - 1) * options.size;
  const { rows, total } = await queryElabore({
    table: source.table,
    filters,
    order,
    offset,
    limit: options.size,
  });
  const pages = Math.max(1, Math.ceil(total / options.size));
  return {
    ...empty(),
    rows,
    total,
    page: Math.min(options.page, pages),
    pages,
  };
}
