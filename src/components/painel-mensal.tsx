"use client";

import { useState } from "react";
import type { AgroindustryItem, PropertySummaryItem } from "@/lib/api";
import { formatCellValue } from "@/lib/format";
import type { PainelData, PainelRow } from "@/lib/painel-mensal";
import { TbChartBar, TbDroplet, TbHorseToy, TbMicroscope, TbMilk } from "react-icons/tb";
import PainelChart from "./painel-charts";
import PainelDinamico, { type DynCost, type DynIndicator } from "./painel-dinamico";
import PainelFacets from "./painel-facets";
import { rangeText } from "@/lib/painel-format";
import SummaryCard, { formatDecimal } from "./summary-card";
import PrintButton from "./print-button";
import ScreenFilters from "./screen-filters";

type Props = {
  data: PainelData;
  properties: PropertySummaryItem[];
  agroindustries: AgroindustryItem[];
  exportHref?: string;
  fullSheetHref?: string;
};

// KPIs do painel antigo, na mesma ordem: valor = média simples dos meses exibidos (como lá).
const KPIS = [
  { key: "milk_lactating_cow_day", label: "Produtividade das Vacas em Lactação", unit: "Litros / animal / dia", icon: <TbChartBar />, info: "Produção diária de leite ÷ vacas em lactação, média dos meses exibidos." },
  { key: "milk_daily", label: "Produção Média do Leite", unit: "Litros / dia", icon: <TbMilk />, info: "Litros produzidos por dia, média dos meses exibidos." },
  { key: "lactating_cows", label: "Vacas em Lactação", unit: "animal", icon: <TbHorseToy />, info: "Número de vacas em lactação, média dos meses exibidos." },
  { key: "ccs", label: "CCS", unit: "x1000 cél. / ml", icon: <TbMicroscope />, info: "Contagem de células somáticas, média dos meses exibidos." },
  { key: "cpp", label: "CPP", unit: "x1000 UFC / ml", icon: <TbDroplet />, info: "Contagem padrão em placas, média dos meses exibidos." },
] as const;

const CORES = ["#004d49", "#e28a10", "#29927d", "#a9d1c5"];
const CUSTO = ["#004d49", "#29927d", "#4fc9b0", "#a9d1c5"];

function findRow(data: PainelData, key: string): PainelRow | undefined {
  for (const g of data.groups) {
    const row = g.rows.find((r) => r.key === key);
    if (row) return row;
  }
  return undefined;
}

// Elementos de custo do gráfico dinâmico: R$/litro = soma das despesas do mês ÷ leite produzido.
const CUSTOS: { id: string; name: string; parts: string[] }[] = [
  { id: "mao-de-obra", name: "Mão de obra para manejo de rebanho", parts: ["hired_labor_expenses"] },
  { id: "concentrados", name: "Consumo de concentrados e minerais", parts: ["concentrate_amount_total", "mineral_amount_total"] },
  { id: "volumosos", name: "Consumo de volumosos", parts: ["voluminous_amount_total"] },
  { id: "aleitamento", name: "Aleitamento", parts: ["milk_replacer", "milk_calves"] },
  { id: "energia", name: "Energia", parts: ["energy"] },
  { id: "combustivel", name: "Combustível", parts: ["fuel"] },
  { id: "medicamentos", name: "Medicamentos e vacinas", parts: ["medicines_vaccines"] },
  { id: "reproducao", name: "Reprodução", parts: ["reproduction"] },
  { id: "assistencia", name: "Assistência técnica", parts: ["technical_assistance"] },
  { id: "hormonios", name: "Hormônios", parts: ["hormones"] },
  { id: "ordenha", name: "Material de ordenha e qualidade do leite", parts: ["milking_material"] },
  { id: "reparos", name: "Reparos e consertos", parts: ["repairs"] },
  { id: "cama", name: "Reposição da cama", parts: ["bedding_replacement"] },
  { id: "administracao", name: "Administração", parts: ["administration"] },
  { id: "outras", name: "Outras despesas", parts: ["general_expenses"] },
  { id: "impostos", name: "Impostos e taxas", parts: ["taxes_fees"] },
  { id: "arrendamento", name: "Arrendamento", parts: ["land_lease"] },
];

function buildDynamic(series: Record<string, (number | null)[]>, months: number): { indicators: DynIndicator[]; costs: DynCost[] } {
  const empty = Array.from({ length: months }, () => null as number | null);
  const col = (key: string) => series[key] ?? empty;
  const milk = col("milk_produced");
  const costs: DynCost[] = CUSTOS.map((c) => ({
    id: c.id,
    label: `${c.name} (R$/litro)`,
    name: c.name,
    values: milk.map((l, i) => {
      const parts = c.parts.map((k) => col(k)[i]).filter((v): v is number => v !== null);
      return l && l > 0 && parts.length ? parts.reduce((a, b) => a + b, 0) / l : null;
    }),
  }));
  const indicators: DynIndicator[] = [
    { id: "vacas", radioLabel: "Vacas em lactação (animais/mês)", titleLabel: "Vacas em lactação (animal)", name: "Vacas em lactação", unit: "animal", decimals: 0, values: col("lactating_cows") },
    { id: "producao", radioLabel: "Produção de leite (litros/mês)", titleLabel: "Produção de leite (litros/mês)", name: "Produção de leite", unit: "litros/mês", decimals: 0, values: col("milk_produced") },
    { id: "animais", radioLabel: "Total de animais (animais/mês)", titleLabel: "Total de animais (animais/mês)", name: "Total de animais", unit: "animais/mês", decimals: 0, values: col("total_cattle") },
  ];
  return { indicators, costs };
}

function statusClass(status: string | null) {
  const v = (status ?? "").toUpperCase();
  return v === "CONSISTENTE" ? "badge-positive" : v === "INCONSISTENTE" ? "badge-danger" : v === "OUTLIER" ? "badge-warning" : "badge-neutral";
}

// Na impressão a tabela só comporta os últimos 6 meses (A4 paisagem); a média do período é recalculada sobre eles.
const PRINT_MONTHS = 6;

function lastMonths(data: PainelData, n: number): PainelData {
  const total = data.months.length;
  if (total <= n) return data;
  const from = total - n;
  const mean = (vals: (number | null)[]) => {
    const valid = vals.filter((v): v is number => v !== null);
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  };
  return {
    ...data,
    months: data.months.slice(from),
    series: Object.fromEntries(Object.entries(data.series).map(([k, v]) => [k, v.slice(from)])),
    groups: data.groups.map((g) => ({
      ...g,
      rows: g.rows.map((r) => {
        const values = r.values.slice(from);
        return { ...r, values, average: mean(values) };
      }),
    })),
  };
}

export default function PainelMensal({ data: fullData, properties, agroindustries, exportHref, fullSheetHref }: Props) {
  const [printing, setPrinting] = useState(false);
  const data = fullData;
  const tableData = printing ? lastMonths(fullData, PRINT_MONTHS) : fullData;
  const labels = data.months.map((m) => m.label);
  const s = (key: string) => data.series[key] ?? labels.map(() => null);
  const dynamic = buildDynamic(data.series, labels.length);
  const farm = data.property;

  const periodo = data.months.length
    ? `${data.months[0].label} a ${data.months[data.months.length - 1].label}`
    : "";
  const emitidoEm = new Date().toLocaleDateString("pt-BR");

  return (
    <div className="flex flex-col gap-3">
      {farm && (
        <div className="painel-print-only painel-print-head">
          <div>
            <h1>Indicadores Mensais</h1>
            <p>
              {farm.property_name} · {farm.labor_rural_code}
              {periodo && ` · ${periodo}`}
            </p>
          </div>
          <img src="/img/logo.png" alt="Labor Rural" />
        </div>
      )}
      {farm && (
        <div className="painel-print-only painel-print-foot">
          <span>© Labor Rural | Departamento de Inteligência | 2026</span>
          <span>Emitido em {emitidoEm}</span>
        </div>
      )}
      <div className="painel-head">
        <div>
          <h1 className="page-title">Indicadores Mensais</h1>
          <p className="page-subtitle">Painel da fazenda: meses nas colunas, indicadores nas linhas</p>
        </div>
      </div>

      <div className="lancamentos-filtro-bar">
        <div className="lanc-filtro-esq">
          {exportHref && (
            <a href={exportHref} download className="btn-table-export" title="Exporta os indicadores mensais da fazenda e do período filtrados">
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
          {farm && <PrintButton onBeforePrint={() => setPrinting(true)} onAfterPrint={() => setPrinting(false)} />}
        </div>
        <ScreenFilters filters={["ano", "mes", "prop", "agro"]} properties={properties} agroindustries={agroindustries} />
      </div>

      {data.notice && (
        <div className="flex items-center gap-2.5 rounded-lg border border-[#bae6fd] bg-[#e7f3fb] px-3.5 py-2.5 text-xs font-semibold text-[#176695]">
          <span className="material-symbols-rounded shrink-0" style={{ fontSize: 18 }}>info</span>
          <span>{data.notice}</span>
        </div>
      )}

      {farm && data.months.length > 0 && (
        <>
          <div className="painel-farm">
            {farm.property_name}
            <small>
              {farm.labor_rural_code} · {data.months[0].label} a {data.months[data.months.length - 1].label} ({data.months.length}{" "}
              {data.months.length === 1 ? "mês" : "meses"})
            </small>
          </div>

          <div className="painel-status" aria-label="Consistência por mês">
            {data.months.map((m) => (
              <span key={m.key} className={`badge ${statusClass(m.status)}`} title={m.status ?? "Sem status"}>
                {m.label}
              </span>
            ))}
          </div>

          <h2 className="painel-section-title">
            Resumo do período · {data.months[0].label} a {data.months[data.months.length - 1].label}
          </h2>
          <div className="summary-grid" style={{ "--summary-cols": 5 } as React.CSSProperties}>
            {KPIS.map((k) => {
              const row = findRow(data, k.key);
              const last = row?.values[row.values.length - 1] ?? null;
              const show = (v: number | null | undefined) => (v == null ? "—" : formatDecimal(v, 2));
              return (
                <SummaryCard
                  key={k.key}
                  variant="vertical"
                  icon={k.icon}
                  label={k.label}
                  labelTooltip={k.info}
                  value={show(row?.average)}
                  unit={k.unit}
                  subtext={`último mês (${data.months[data.months.length - 1].label}): ${show(last)}`}
                />
              );
            })}
          </div>

          <section className="painel-charts painel-charts--half" aria-label="Gráficos">
            <div className="painel-chart-wide">
              <PainelChart
                title="Produção diária x Produção/Vacas em lactação"
                unit="L"
                labels={labels}
                kind="combo"
                decimals={2}
                series={[
                  { name: "Produção média diária de leite", color: CORES[0], values: s("milk_daily") },
                  { name: "Produtividade das vacas em lactação (litros/animal/dia)", color: "#4fc9b0", values: s("milk_lactating_cow_day") },
                ]}
              />
            </div>
            <PainelFacets
              id="qualidade"
              facetHeight={92}
              title="Evolução CPP e CCS"
              takeaway={[rangeText("CCS", s("ccs"), labels, 0), rangeText("CPP", s("cpp"), labels, 0)].filter(Boolean).join(" · ") || "Sem dados de qualidade no período"}
              labels={labels}
              facets={[
                { name: "CCS", unit: "x1000 cél./ml", color: CUSTO[0], values: s("ccs"), kind: "line", decimals: 0 },
                { name: "CPP", unit: "x1000 UFC/ml", color: CUSTO[1], values: s("cpp"), kind: "line", decimals: 0 },
              ]}
            />
          </section>

          <PainelDinamico labels={labels} indicators={dynamic.indicators} costs={dynamic.costs} />

          <h2 className="painel-section-title painel-pivot-title">Indicadores por mês</h2>
          <div className="table-scroll painel-pivot">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="sticky-label">Indicador</th>
                  {tableData.months.map((m) => (
                    <th key={m.key} className="text-right">{m.label}</th>
                  ))}
                  <th className="text-right avg" title="Média simples dos meses exibidos que têm valor">Média do período</th>
                </tr>
              </thead>
              {tableData.groups.map((group) => (
                <tbody key={group.name}>
                  <tr>
                    <td className="group-row" colSpan={tableData.months.length + 2}>{group.name}</td>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.key}>
                      <td className="sticky-label">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={tableData.months[i].key} className="text-right font-tabular">{formatCellValue(v, row.type)}</td>
                      ))}
                      <td className="text-right font-tabular avg">{formatCellValue(row.average, row.type)}</td>
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
