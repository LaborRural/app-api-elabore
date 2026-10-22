"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { labelStep } from "@/lib/painel-format";

// Múltiplos pequenos: cada medida tem o seu painel e o seu eixo, todos alinhados no mesmo
// eixo de meses. Nunca eixo duplo: duas medidas de escalas diferentes viram dois painéis.
// Só os extremos levam rótulo, a linha tracejada é a média do período, e o valor da média
// fica no cabeçalho do painel.
const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div className="painel-chart-empty">Carregando gráfico…</div>,
});

export type Facet = {
  name: string;
  unit: string;
  color: string;
  values: (number | null)[];
  kind: "line" | "bar";
  decimals?: number;
  /** Outras linhas na mesma escala, desenhadas no mesmo painel (só para kind "line"). */
  extra?: { name: string; color: string; values: (number | null)[] }[];
};

type Props = {
  /** Identifica o card de múltiplos pequenos. */
  id?: string;
  title: string;
  /** Frase-resumo calculada a partir dos dados (a conclusão do gráfico). */
  takeaway: string;
  labels: string[];
  facets: Facet[];
  /** Altura de cada painel em px (padrão 150); menor deixa o card mais baixo. */
  facetHeight?: number;
  /** Rótulo em todos os pontos (padrão: só o maior e o menor). */
  labelAll?: boolean;
};

const AXIS_X = "#6b7280";
const AXIS_Y = "#9ca3af";
const GRID = "#e5e7eb";
const INK = "#374151";
const DEFAULT_FACET_HEIGHT = 150;
// Rótulo dentro da barra: distância do topo (px) e altura mínima da barra para caber assim.
const INNER_LABEL_OFFSET = 28;
const INNER_MIN_BAR = 40;
const Y_LABEL_WIDTH = 46; // mesma largura em todos os painéis, para os meses ficarem alinhados

function fmt(value: number, decimals: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function mean(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

function FacetPlot({ facet, labels, last, height, labelAll }: { facet: Facet; labels: string[]; last: boolean; height: number; labelAll: boolean }) {
  const decimals = facet.decimals ?? 2;
  const avg = mean(facet.values);
  const lines = useMemo(() => [{ name: facet.name, color: facet.color, values: facet.values }, ...(facet.extra ?? [])], [facet]);
  const multi = lines.length > 1;

  const options = useMemo<ApexOptions>(() => {
    const valid = lines.flatMap((l) => l.values).filter((v): v is number => v !== null);
    const lo = valid.length ? Math.min(...valid) : 0;
    const hi = valid.length ? Math.max(...valid) : 1;
    const pad = Math.max((hi - lo) * 0.25, Math.abs(hi) * 0.05, 1e-6);
    // Barras sempre partem do zero; linhas podem recortar o eixo para mostrar a variação.
    const min = facet.kind === "bar" || lo >= 0 ? Math.max(0, facet.kind === "bar" ? 0 : lo - pad) : lo - pad;
    // Com rótulo em todos os pontos o topo precisa de folga: o maior valor leva o rótulo acima.
    const max = labelAll && facet.kind === "line" ? hi + Math.max(pad, (hi - min) * 0.22) : hi + pad;

    // Por padrão rótulo só no maior e no menor valor; com labelAll, em todos os meses (um a cada
    // `step` quando há muitos), sempre acima do ponto/barra, para um rótulo nunca cobrir outro.
    const step = labelStep(labels.length);
    const iMax = facet.values.findIndex((v) => v === hi);
    const iMin = facet.values.findIndex((v) => v === lo);
    const marks = labelAll
      ? facet.values.map((v, i) => (v !== null && i % step === 0 ? i : -1)).filter((i) => i >= 0)
      : [...new Set([iMax, iMin])].filter((i) => i >= 0 && valid.length > 1);
    // Várias linhas no mesmo painel: rótulo no maior e no menor de cada uma; em cada mês o valor mais
    // alto vai acima do ponto e o mais baixo abaixo dele, para um rótulo nunca cobrir o outro.
    const multiPoints = multi
      ? [
          ...new Set(
            lines.flatMap((l) => {
              const v = l.values.filter((x): x is number => x !== null);
              return v.length > 1 ? [l.values.indexOf(Math.max(...v)), l.values.indexOf(Math.min(...v))] : [];
            }),
          ),
        ].flatMap((i) => {
          const at = lines.flatMap((l, j) => (l.values[i] === null ? [] : [{ j, v: l.values[i] as number }]));
          return at.map(({ j, v }) => ({
            x: labels[i],
            y: v,
            marker: { size: 0 },
            label: {
              text: fmt(v, decimals),
              offsetY: at.every((o) => o.j === j || v >= o.v) ? -8 : 18,
              borderWidth: 0,
              style: { background: "transparent", color: lines[j].color, fontSize: "11px", fontWeight: 700 },
            },
          }));
        })
      : [];
    const points = multi ? multiPoints : marks.map((i) => {
      const v = facet.values[i] as number;
      // Barra: valor em branco e negrito dentro da barra, com folga do topo. Barra baixa demais para
      // caber o texto com essa folga: o valor sobe para cima da barra, em cinza-escuro.
      const inside = facet.kind === "bar" && (v / max) * height >= INNER_MIN_BAR;
      return {
        x: labels[i],
        y: v,
        marker: { size: 0 },
        label: {
          text: fmt(v, decimals),
          offsetY: inside ? INNER_LABEL_OFFSET : labelAll || i === iMax || facet.kind === "bar" ? -8 : 18,
          borderWidth: 0,
          style: { background: "transparent", color: inside ? "#ffffff" : INK, fontSize: "11px", fontWeight: 700 },
        },
      };
    });

    return {
      chart: {
        type: facet.kind === "bar" ? "bar" : "line",
        height: height + (last ? 22 : 0),
        toolbar: { show: false },
        zoom: { enabled: false },
        fontFamily: "inherit",
        animations: { enabled: false },
        parentHeightOffset: 0,
      },
      colors: lines.map((l) => l.color),
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: facet.kind === "line" ? { width: 2, curve: "straight" } : { width: 0 },
      markers: facet.kind === "line" ? { size: 4, strokeWidth: 2, strokeColors: "#ffffff", hover: { size: 6 } } : { size: 0 },
      plotOptions: { bar: { columnWidth: "46%", borderRadius: 4 } },
      grid: { borderColor: GRID, strokeDashArray: 2, padding: { left: 4, right: 8, top: 0, bottom: 0 } },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        crosshairs: { show: true },
        // Os pontos ficam no meio de cada mês, alinhados com as barras e sem invadir o eixo Y.
        tickPlacement: "between",
        // Nunca desligar os rótulos do eixo (show: false): o ApexCharts então deixa de desenhar os
        // rótulos de valor do painel. Nos painéis de cima o texto só fica transparente e sem altura.
        labels: last
          ? { show: true, style: { colors: AXIS_X, fontSize: "11px" }, offsetY: 2, rotate: 0, hideOverlappingLabels: true }
          : { show: true, style: { colors: "transparent" }, maxHeight: 1, minHeight: 0 },
        tooltip: { enabled: false },
      },
      yaxis: {
        min,
        max,
        tickAmount: 3,
        labels: { minWidth: Y_LABEL_WIDTH, maxWidth: Y_LABEL_WIDTH, style: { colors: [AXIS_Y], fontSize: "11px" }, formatter: (v) => fmt(v, decimals > 1 ? 1 : decimals) },
      },
      annotations: {
        yaxis: lines.flatMap((l) => {
          const a = mean(l.values);
          return a === null ? [] : [{ y: a, borderColor: l.color, strokeDashArray: 4, opacity: 0.55 }];
        }),
        points,
      },
      tooltip: { shared: true, intersect: false, y: { formatter: (v) => (v == null ? "-" : `${fmt(v, decimals)} ${facet.unit}`) } },
      noData: { text: "Sem dados no período" },
    };
  }, [facet, lines, multi, labels, last, decimals, height, labelAll]);

  const hasData = lines.some((l) => l.values.some((v) => v !== null));

  return (
    <div className="painel-facet">
      <div className="painel-facet-head">
        <span className="painel-facet-name">
          <i className="legend-swatch" style={{ background: facet.color }} />
          {facet.name}
          {facet.extra?.map((l) => (
            <span key={l.name} style={{ marginLeft: 12 }}>
              <i className="legend-swatch" style={{ background: l.color }} />
              {l.name}
            </span>
          ))}{" "}
          <small>({facet.unit})</small>
        </span>
        <span className="painel-facet-avg">
          {multi ? lines.map((l) => `média ${fmt(mean(l.values) ?? 0, decimals)}`).join(" · ") : `média ${avg === null ? "-" : fmt(avg, decimals)}`}
        </span>
      </div>
      {hasData ? (
        <Chart options={options} series={lines.map((l) => ({ name: l.name, data: l.values }))} type={facet.kind === "bar" ? "bar" : "line"} height={height + (last ? 22 : 0)} />
      ) : (
        <div className="painel-chart-empty" style={{ height }}>Sem dados no período</div>
      )}
    </div>
  );
}

export default function PainelFacets({ title, takeaway, labels, facets, facetHeight = DEFAULT_FACET_HEIGHT, labelAll = false }: Props) {
  return (
    <article className="panel-card painel-chart">
      <div className="painel-chart-head">
        <h2>{title}</h2>
        <p>{takeaway}</p>
      </div>
      {facets.map((f, i) => (
        <FacetPlot key={f.name} facet={f} labels={labels} last={i === facets.length - 1} height={facetHeight} labelAll={labelAll} />
      ))}
      <p className="painel-facet-note">Linha tracejada: média do período.</p>
    </article>
  );
}
