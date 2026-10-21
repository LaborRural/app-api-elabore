import "server-only";
import { getNestedValue } from "./screens";
import type { ResolvedScreenData } from "./screen-data";

/** KPI já formatado para o SummaryCard (valor "—" quando não há dado, nunca 0 inventado). */
export type AreaKpi = {
  id: string;
  icon: "area" | "irrigated" | "planted" | "cultures" | "expense" | "executed";
  label: string;
  tooltip: string;
  value: string;
  valueTitle?: string;
  subtext?: string;
};

const NO_DATA = "—";

function num(row: Record<string, unknown>, key: string): number {
  const n = Number(getNestedValue(row, key));
  return Number.isFinite(n) ? n : 0;
}

function dec(value: number, digits = 2): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(value);
}

function brl(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function brlCompact(value: number): string {
  if (Math.abs(value) < 1000) return brl(value);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/**
 * 2 KPIs por tela do grupo "Áreas", calculados sobre todos os registros que
 * passam pelos filtros atuais (não só a página visível).
 * Devolve [] para telas fora do grupo.
 */
export function buildAreaKpis(slug: string, data: ResolvedScreenData): AreaKpi[] {
  const rows = data.rows;
  const has = rows.length > 0;

  if (slug === "areas") {
    const own = rows.reduce((s, r) => s + num(r, "hectares_owned"), 0);
    const rented = rows.reduce((s, r) => s + num(r, "hectares_rented"), 0);
    const irrigated = rows.filter((r) => r.is_irrigated === true).length;
    return [
      {
        id: "area-total",
        icon: "area",
        label: "Área total (ha)",
        tooltip: "Soma de hectares próprios + arrendados das áreas filtradas.",
        value: has ? dec(own + rented) : NO_DATA,
        subtext: has ? `${dec(own)} ha próprios · ${dec(rented)} ha arrendados` : undefined,
      },
      {
        id: "areas-irrigadas",
        icon: "irrigated",
        label: "Áreas irrigadas",
        tooltip: "Quantidade de áreas marcadas como irrigadas e o percentual sobre o total de áreas filtradas.",
        value: has ? dec(irrigated, 0) : NO_DATA,
        subtext: has ? `${dec((irrigated / rows.length) * 100, 1)}% de ${dec(rows.length, 0)} áreas` : undefined,
      },
    ];
  }

  if (slug === "culturas-plantadas") {
    const planted = rows.reduce((s, r) => s + num(r, "planted_area"), 0);
    const cultures = new Set(
      rows.map((r) => String(getNestedValue(r, "culture.name") ?? "").trim()).filter(Boolean),
    );
    return [
      {
        id: "area-plantada",
        icon: "planted",
        label: "Área plantada (ha)",
        tooltip: "Soma da área plantada (ha) dos registros filtrados.",
        value: has ? dec(planted) : NO_DATA,
        subtext: has ? `${dec(rows.length, 0)} plantios` : undefined,
      },
      {
        id: "culturas-distintas",
        icon: "cultures",
        label: "Culturas distintas",
        tooltip: "Quantidade de culturas diferentes entre os plantios filtrados.",
        value: has ? dec(cultures.size, 0) : NO_DATA,
      },
    ];
  }

  if (slug === "despesas-culturas") {
    const total = rows.reduce((s, r) => s + num(r, "line_total"), 0);
    const executed = rows.filter((r) => r.executed === true).length;
    return [
      {
        id: "despesa-total",
        icon: "expense",
        label: "Valor total (R$)",
        tooltip: "Soma do valor total das aplicações da aba selecionada, nos filtros atuais.",
        value: has ? brlCompact(total) : NO_DATA,
        valueTitle: has ? brl(total) : undefined,
        subtext: has ? `${dec(rows.length, 0)} aplicações` : undefined,
      },
      {
        id: "aplicacoes-executadas",
        icon: "executed",
        label: "Aplicações executadas",
        tooltip: "Percentual de aplicações marcadas como executadas sobre o total filtrado.",
        value: has ? `${dec((executed / rows.length) * 100, 1)}%` : NO_DATA,
        subtext: has ? `${dec(executed, 0)} de ${dec(rows.length, 0)}` : undefined,
      },
    ];
  }

  return [];
}
