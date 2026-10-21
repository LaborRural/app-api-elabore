import "@/app/painel-mensal.css";
import type { AgroindustryItem, PropertySummaryItem } from "@/lib/api";
import { formatCellValue } from "@/lib/format";
import type { PainelAnualData } from "@/lib/painel-anual";
import { rangeText } from "@/lib/painel-format";
import { TbChartBar, TbCoin, TbMilk, TbPercentage, TbReportMoney } from "react-icons/tb";
import PainelChart from "./painel-charts";
import PainelFacets from "./painel-facets";
import PrintButton from "./print-button";
import ScreenFilters from "./screen-filters";
import SummaryCard, { formatCurrency, formatCurrencyCompact, formatDecimal, formatDeltaPercent } from "./summary-card";

type Props = {
  data: PainelAnualData;
  properties: PropertySummaryItem[];
  agroindustries: AgroindustryItem[];
  exportHref?: string;
  fullSheetHref?: string;
};

const BASE_TARGET = "12 meses antes";

// KPIs da última janela de 12 meses, cada um comparado com a janela que terminou 12 meses antes.
const KPIS = [
  { key: "milk_daily_annual", label: "Produção Média do Leite", unit: "Litros / dia", icon: <TbMilk />, info: "Litros por dia na janela de 12 meses.", money: false, decimals: 0 },
  { key: "milk_lactating_cow_day_annual", label: "Produtividade das Vacas em Lactação", unit: "Litros / animal / dia", icon: <TbChartBar />, info: "Produção diária ÷ vacas em lactação, na janela de 12 meses.", money: false, decimals: 2 },
  { key: "total_activity_revenue_annual", label: "Renda Bruta da Atividade", unit: "R$ / ano", icon: <TbReportMoney />, info: "Renda bruta da atividade leiteira na janela de 12 meses.", money: true, decimals: 2 },
  { key: "net_margin_liter_annual", label: "Margem Líquida Unitária", unit: "R$ / litro", icon: <TbCoin />, info: "Margem líquida da atividade ÷ litros produzidos, na janela de 12 meses.", money: true, decimals: 2 },
  { key: "capital_return_rate_annual", label: "Remuneração do Capital", unit: "% ao ano", icon: <TbPercentage />, info: "Taxa de remuneração do capital com terra, na janela de 12 meses.", money: false, decimals: 2 },
] as const;

const CUSTO = ["#004d49", "#29927d", "#4fc9b0", "#a9d1c5"];

type Col = (number | null)[];

function perLiter(parts: Col[], milk: Col): Col {
  return milk.map((l, i) => {
    const valid = parts.map((p) => p[i]).filter((v): v is number => v !== null);
    return l && l > 0 && valid.length ? valid.reduce((a, b) => a + b, 0) / l : null;
  });
}

/** Composição do custo total por litro: alimentação, mão de obra, capital e demais (resto até o custo total). */
function buildComposition(series: Record<string, Col>, windows: number) {
  const empty: Col = Array.from({ length: windows }, () => null);
  const col = (key: string) => series[key] ?? empty;
  const milk = col("milk_produced_annual");
  const feed = perLiter([col("concentrate_mineral_cost_annual"), col("voluminous_amount_total_annual"), col("aleitamento_annual")], milk);
  const labor = perLiter([col("hired_labor_expenses_annual"), col("family_labor_expenses_annual")], milk);
  const capital = perLiter([col("total_depreciation_annual"), col("capital_opportunity_cost_annual")], milk);
  const total = perLiter([col("ct_annual")], milk);
  const others = total.map((t, i) => (t === null ? null : Math.max(0, t - (feed[i] ?? 0) - (labor[i] ?? 0) - (capital[i] ?? 0))));
  return { feed, labor, capital, others };
}

function statusClass(status: string | null) {
  const v = (status ?? "").toUpperCase();
  return v === "CONSISTENTE" ? "badge-positive" : v === "INCONSISTENTE" ? "badge-danger" : v === "OUTLIER" ? "badge-warning" : "badge-neutral";
}

function yoyText(last: number | null, base: number | null | undefined): string {
  if (last === null || base == null || Math.abs(base) < 1e-9) return "—";
  const d = ((last - base) / Math.abs(base)) * 100;
  return `${d > 0 ? "+" : ""}${formatDecimal(d, 1)}%`;
}

export default function PainelAnual({ data, properties, agroindustries, exportHref, fullSheetHref }: Props) {
  const labels = data.months.map((m) => m.label);
  const n = labels.length;
  const s = (key: string) => data.series[key] ?? labels.map(() => null);
  const comp = buildComposition(data.series, n);
  const farm = data.property;
  const first = data.months[0];
  const lastMonth = data.months[n - 1];

  return (
    <div className="flex flex-col gap-3">
      <div className="painel-head">
        <div>
          <h1 className="page-title">Indicadores Anuais</h1>
          <p className="page-subtitle">Painel anual da fazenda: janelas móveis de 12 meses, identificadas pelo mês em que terminam</p>
        </div>
      </div>

      <div className="lancamentos-filtro-bar">
        <div className="lanc-filtro-esq">
          {exportHref && (
            <a href={exportHref} download className="btn-table-export" title="Exporta os indicadores anuais da fazenda e do período filtrados">
              <span className="material-symbols-rounded" style={{ fontSize: 17 }}>download</span>
              <span>Exportar Excel</span>
            </a>
          )}
          {fullSheetHref && (
            <a href={fullSheetHref} download className="btn-table-export">
              <span className="material-symbols-rounded" style={{ fontSize: 17 }}>cloud_download</span>
              <span>Planilha completa</span>
            </a>
          )}
          {farm && <PrintButton />}
        </div>
        <ScreenFilters filters={["ano", "mes", "prop", "agro"]} properties={properties} agroindustries={agroindustries} />
      </div>

      {data.notice && (
        <div className="flex items-center gap-2.5 rounded-lg border border-[#bae6fd] bg-[#e7f3fb] px-3.5 py-2.5 text-xs font-semibold text-[#176695]">
          <span className="material-symbols-rounded shrink-0" style={{ fontSize: 18 }}>info</span>
          <span>{data.notice}</span>
        </div>
      )}

      {farm && n > 0 && (
        <>
          <div className="painel-farm">
            {farm.property_name}
            <small>
              {farm.labor_rural_code} · janelas de 12 meses terminando de {first.label} a {lastMonth.label} ({n} {n === 1 ? "janela" : "janelas"}) · Ano e Mês filtram o mês final
            </small>
          </div>

          <div className="painel-status" aria-label="Consistência por janela">
            {data.months.map((m) => (
              <span key={m.key} className={`badge ${statusClass(m.status)}`} title={`${m.title ?? m.label} · ${m.status ?? "Sem status"}`}>
                {m.label}
              </span>
            ))}
          </div>

          <h2 className="painel-section-title">Última janela · {lastMonth.title}</h2>
          <div className="summary-grid" style={{ "--summary-cols": 5 } as React.CSSProperties}>
            {KPIS.map((k) => {
              const last = s(k.key)[n - 1] ?? null;
              const base = data.base?.values[k.key] ?? null;
              const text = last === null ? "—" : k.money ? formatCurrencyCompact(last) : formatDecimal(last, k.decimals);
              return (
                <SummaryCard
                  key={k.key}
                  variant="vertical"
                  icon={k.icon}
                  label={k.label}
                  labelTooltip={k.info}
                  value={text}
                  valueTitle={last !== null && k.money ? formatCurrency(last) : undefined}
                  unit={k.unit}
                  delta={formatDeltaPercent(last, base, {
                    target: BASE_TARGET,
                    noBaseTarget: `janela que termina 12 meses antes de ${lastMonth.label}`,
                  })}
                />
              );
            })}
          </div>

          <section className="painel-charts painel-charts--half" aria-label="Rentabilidade e composição do custo">
            <PainelFacets
              id="rentabilidade-anual"
              facetHeight={110}
              title="Rentabilidade e margem"
              takeaway={[rangeText("Margem líquida", s("net_margin_liter_annual"), labels, 2, "R$/L "), rangeText("Rentabilidade", s("capital_return_rate_annual"), labels, 1)].filter(Boolean).join(" · ") || "Sem dados de rentabilidade no período"}
              labels={labels}
              facets={[
                { name: "Margem líquida unitária", unit: "R$/litro", color: CUSTO[0], values: s("net_margin_liter_annual"), kind: "line", decimals: 2 },
                { name: "Rentabilidade", unit: "% ao ano", color: CUSTO[1], values: s("capital_return_rate_annual"), kind: "line", decimals: 1 },
              ]}
            />
            <PainelChart
              title="Composição do custo total (R$/litro)"
              subtitle="Alimentação, mão de obra e capital; “Demais custos” é o que falta para fechar o custo total"
              unit="R$/L"
              labels={labels}
              kind="stacked"
              decimals={2}
              height={285}
              series={[
                { name: "Alimentação", color: CUSTO[0], values: comp.feed },
                { name: "Mão de obra", color: CUSTO[1], values: comp.labor },
                { name: "Capital (depreciação e remuneração)", color: CUSTO[2], values: comp.capital },
                { name: "Demais custos", color: CUSTO[3], values: comp.others },
              ]}
            />
          </section>

          <h2 className="painel-section-title">Indicadores por janela</h2>
          <div className="table-scroll painel-pivot">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky-label">Indicador</th>
                  {data.months.map((m) => (
                    <th key={m.key} className="text-right" title={m.title}>{m.label}</th>
                  ))}
                  <th className="text-right avg" title={data.base ? `Janela ${lastMonth.label} contra a janela que termina em ${data.base.label}` : "Sem janela 12 meses antes"}>
                    {data.base ? `Var. vs ${data.base.label}` : "Var. 12 meses"}
                  </th>
                </tr>
              </thead>
              {data.groups.map((group) => (
                <tbody key={group.name}>
                  <tr>
                    <td className="group-row" colSpan={n + 2}>{group.name}</td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.key}>
                      <td className="sticky-label">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={data.months[i].key} className="text-right font-tabular">{formatCellValue(v, row.type)}</td>
                      ))}
                      <td className="text-right font-tabular avg">{yoyText(row.values[n - 1], data.base?.values[row.key])}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
