"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { labelStep } from "@/lib/painel-format";

// Padrão de gráficos da aplicação Elabore (skill lr-dashboards): ApexCharts, sem barra de
// ferramentas, sem legenda do Apex (a legenda fica no título do painel), sem dataLabels
// (os valores saem por annotations.points, acima do ponto) e eixo Y com folga para os
// rótulos não serem cortados.
const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div className="painel-chart-empty">Carregando gráfico…</div>,
});

export type ChartSeries = { name: string; color: string; values: (number | null)[] };

type Props = {
  title: string;
  subtitle?: string;
  unit: string;
  labels: string[];
  series: ChartSeries[];
  kind: "line" | "stacked" | "combo";
  decimals?: number;
  /** Casas decimais das barras no gráfico combinado (padrão 0). */
  barDecimals?: number;
  /** Altura do gráfico em px (padrão 260). */
  height?: number;
};

const AXIS_X = "#6b7280";
const AXIS_Y = "#9ca3af";
const GRID = "#e5e7eb";
const LABEL = "#374151";

function fmt(value: number, decimals: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

type Built = { options: ApexOptions; apexSeries: ApexOptions["series"] };

const MINT = "#4fc9b0";


/** Barras (1ª série, eixo esquerdo) + linha (2ª série, eixo direito), como no painel antigo. */
function buildCombo(series: ChartSeries[], labels: string[], unit: string, decimals: number, barDecimals: number): Built {
  const [bars, line] = series;
  const step = labelStep(labels.length);
  const nums = (v: (number | null)[]) => v.filter((x): x is number => x !== null);
  const barMax = Math.max(0, ...nums(bars.values)) * 1.15 || 1;

  // A linha vive na faixa de cima do gráfico (45% a 85% da altura) e o rótulo das barras fica
  // na base, dentro da barra: assim os dois nunca ocupam o mesmo lugar. O eixo da direita fica
  // oculto, porque cada ponto já traz o valor escrito.
  const lineVals = nums(line.values);
  const lineMin = lineVals.length ? Math.min(...lineVals) : 0;
  const lineMaxRaw = lineVals.length ? Math.max(...lineVals) : 1;
  const range = Math.max(lineMaxRaw - lineMin, Math.abs(lineMaxRaw) * 0.1, 1e-6);
  const span = range / 0.4;
  const lineAxisMin = lineMin - 0.45 * span;
  const lineAxisMax = lineAxisMin + span;

  const label = (text: string, offsetY: number, color: string, background: string) => ({
    text,
    offsetY,
    borderWidth: 0,
    style: { background, color, fontSize: "11px", fontWeight: 700, padding: { left: 4, right: 4, top: 1, bottom: 1 } },
  });
  const points: NonNullable<ApexOptions["annotations"]>["points"] = [
    ...bars.values.flatMap((v, i) =>
      v === null || i % step ? [] : [{ x: labels[i], y: 0, yAxisIndex: 0, marker: { size: 0 }, label: label(fmt(v, barDecimals), -12, "#ffffff", "transparent") }],
    ),
    ...line.values.flatMap((v, i) =>
      v === null || i % step ? [] : [{ x: labels[i], y: v, yAxisIndex: 1, marker: { size: 0 }, label: label(fmt(v, decimals), -10, "#003f3c", MINT) }],
    ),
  ];
  const options: ApexOptions = {
    chart: { type: "line", toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "inherit", animations: { enabled: false }, parentHeightOffset: 0 },
    colors: [bars.color, line.color],
    legend: { show: false },
    dataLabels: { enabled: false },
    stroke: { width: [0, 2.5], curve: "smooth" },
    markers: { size: [0, 4], strokeWidth: 0, hover: { size: 6 } },
    plotOptions: { bar: { columnWidth: "62%", borderRadius: 2 } },
    grid: { borderColor: GRID, strokeDashArray: 2, padding: { left: 4, right: 8 } },
    xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { colors: AXIS_X, fontSize: "11px" }, offsetY: 4, rotate: 0, hideOverlappingLabels: true } },
    yaxis: [
      { seriesName: bars.name, min: 0, max: barMax, tickAmount: 5, labels: { style: { colors: [AXIS_Y], fontSize: "11px" }, formatter: (v) => fmt(v, 0) } },
      { seriesName: line.name, opposite: true, show: false, min: lineAxisMin, max: lineAxisMax },
    ],
    annotations: { points },
    tooltip: { shared: true, intersect: false, y: { formatter: (v) => (v == null ? "—" : fmt(v, decimals)) } },
    noData: { text: "Sem dados no período" },
  };
  return {
    options,
    apexSeries: [
      { name: bars.name, type: "column", data: bars.values },
      { name: line.name, type: "line", data: line.values },
    ],
  };
}

export default function PainelChart({ title, subtitle, unit, labels, series, kind, decimals = 2, barDecimals = 0, height = 260 }: Props) {
  const hasData = series.some((s) => s.values.some((v) => v !== null));

  const { options, apexSeries } = useMemo(() => {
    if (kind === "combo") return buildCombo(series, labels, unit, decimals, barDecimals);
    const apexSeries = series.map((s) => ({ name: s.name, data: s.values }));
    const totals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
    const points = kind === "stacked" ? totals.filter((t) => t > 0) : series.flatMap((s) => s.values.filter((v): v is number => v !== null));
    const dataMax = Math.max(0, ...points);
    const dataMin = kind === "stacked" ? 0 : Math.min(0, ...points);
    const range = Math.max(dataMax - dataMin, 1e-9);
    const max = dataMax + range * 0.2; // folga em cima para o rótulo do ponto mais alto
    const min = dataMin < 0 ? dataMin - range * 0.22 : 0;

    const step = labelStep(labels.length);
    const pointAnnotations: NonNullable<ApexOptions["annotations"]>["points"] =
      kind === "stacked"
        ? labels.flatMap((label, i) =>
            totals[i] > 0 && i % step === 0
              ? [{ x: label, y: totals[i], marker: { size: 0 }, label: { text: fmt(totals[i], decimals), offsetY: -4, borderWidth: 0, style: { background: "transparent", color: LABEL, fontSize: "11px", fontWeight: 600 } } }]
              : [],
          )
        : series.flatMap((s, si) =>
            s.values.flatMap((v, i) =>
              v === null || i % step
                ? []
                : [{ x: labels[i], y: v, seriesIndex: si, marker: { size: 0 }, label: { text: fmt(v, decimals), offsetY: si === 0 ? -8 : 16, borderWidth: 0, style: { background: "transparent", color: LABEL, fontSize: "11px", fontWeight: 600 } } }],
            ),
          );

    const options: ApexOptions = {
      chart: { type: kind === "stacked" ? "bar" : "line", stacked: kind === "stacked", toolbar: { show: false }, zoom: { enabled: false }, fontFamily: "inherit", animations: { enabled: false }, parentHeightOffset: 0 },
      colors: series.map((s) => s.color),
      legend: { show: false },
      dataLabels: { enabled: false },
      stroke: kind === "line" ? { width: 2.5, curve: "straight" } : { width: 0 },
      markers: kind === "line" ? { size: 3.5, strokeWidth: 0, hover: { size: 5 } } : { size: 0 },
      plotOptions: { bar: { columnWidth: "62%", borderRadius: 2 } },
      grid: { borderColor: GRID, strokeDashArray: 2, padding: { left: 4, right: 8 } },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: { style: { colors: AXIS_X, fontSize: "11px" }, offsetY: 4, rotate: 0, hideOverlappingLabels: true },
      },
      yaxis: { min, max, tickAmount: 4, labels: { style: { colors: [AXIS_Y], fontSize: "11px" }, formatter: (v) => fmt(v, decimals) } },
      annotations: {
        yaxis: dataMin < 0 ? [{ y: 0, borderColor: AXIS_Y, opacity: 0.7 }] : [],
        points: pointAnnotations,
      },
      tooltip: { shared: true, intersect: false, y: { formatter: (v) => (v == null ? "—" : `${fmt(v, decimals)} ${unit}`) } },
      noData: { text: "Sem dados no período" },
    };
    return { options, apexSeries };
  }, [series, labels, kind, unit, decimals, barDecimals]);

  return (
    <article className="panel-card painel-chart">
      <div className="painel-chart-head">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        <div className="legend-inline">
          {series.map((s) => (
            <span key={s.name}>
              <i className="legend-swatch" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      </div>
      {hasData ? (
        <Chart options={options} series={apexSeries} type={kind === "stacked" ? "bar" : "line"} height={height} />
      ) : (
        <div className="painel-chart-empty">Sem dados no período</div>
      )}
    </article>
  );
}
