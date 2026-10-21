"use client";

import "@/app/painel-mensal.css";
import "@/app/painel-custo.css";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ApexOptions } from "apexcharts";
import type { AgroindustryItem, PropertySummaryItem } from "@/lib/api";
import { ETAPAS, SISTEMA_ROTULO, type DetalheLinha, type PainelCustoData, type PorSistema, type Sistema } from "@/lib/painel-custo-tipos";
import PainelCustoTabela, { type TabelaColuna } from "./painel-custo-tabela";
import ScreenFilters, { SelectBox } from "./screen-filters";

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => <div className="painel-chart-empty">Carregando gráfico…</div>,
});

// Cores por sistema de plantio e por etapa: as mesmas da tela 7 do BI gerencial.
const COR_SISTEMA: Record<Sistema, string> = { "PLANTIO DIRETO": "#0f7a55", "CULTIVO MINIMO": "#72b35a", CONVENCIONAL: "#4f93d6" };
const COR_ETAPA: Record<string, { cor: string; texto: string }> = {
  pre_plantio: { cor: "#cfe8da", texto: "#0f2f2a" },
  plantio: { cor: "#85c4a2", texto: "#0f2f2a" },
  tratos: { cor: "#2f9168", texto: "#ffffff" },
  colheita: { cor: "#0e5a42", texto: "#ffffff" },
  nao_informada: { cor: "#9aaeab", texto: "#0f2f2a" },
};
const AXIS = "#6b7280";
const GRID = "#e5e7eb";
const LABEL = "#374151";

const nf = (v: number | null | undefined, d = 0) =>
  v === null || v === undefined ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const fazLabel = (n: number, curto = false) => `${nf(n)} ${curto ? "faz." : n === 1 ? "fazenda" : "fazendas"}`;

type Props = {
  data: PainelCustoData;
  properties: PropertySummaryItem[];
  agroindustries: AgroindustryItem[];
  fullSheetHref?: string;
};

export default function PainelCusto({ data, properties, agroindustries, fullSheetHref }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [composicao, setComposicao] = useState(false);

  const { sel } = { sel: data.selecao };
  const nomeProduto = data.produtos.filter((p) => sel.produto.includes(p.value)).map((p) => p.label).join(" e ") || "—";
  const ciclo = "1ª safra";
  const sufixoBase = data.custoBase === "DEFLACIONADO" ? " · deflacionado (IGP-DI)" : "";

  function aplicar(updates: Record<string, string[]>, limpar: string[] = []) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const k of limpar) sp.delete(k);
    for (const [k, v] of Object.entries(updates)) {
      if (v.length) sp.set(k, v.join(","));
      else sp.delete(k);
    }
    const qs = sp.toString();
    startTransition(() => router.push(`${pathname}${qs ? `?${qs}` : ""}`));
  }

  const nFazendas = data.sistema.fazendas || data.rodape.fazendasComCusto;
  const porSistema = data.porSistema.filter((p) => p.fazendas > 0);
  const temCusto = porSistema.length > 0;

  return (
    <div className={`flex flex-col gap-3 painel-custo${pending ? " is-pending" : ""}`}>
      <div className="painel-head">
        <div>
          <h1 className="page-title">Custo de Forrageira</h1>
          <p className="page-subtitle">Painel de custos por sistema de plantio · mesmas regras da tela 7 do BI gerencial</p>
        </div>
      </div>

      <div className="lancamentos-filtro-bar">
        <div className="lanc-filtro-esq pc-filtros">
          <SelectBox
            label="Safra"
            placeholder="Todas"
            multiple
            options={data.safras}
            values={sel.safra}
            onChange={(v) => aplicar({ safra: v }, ["cultura", "produto"])}
          />
          <SelectBox
            label="Cultura"
            placeholder="Todas"
            multiple
            options={data.culturas}
            values={sel.cultura}
            onChange={(v) => aplicar({ cultura: v }, ["produto"])}
          />
          <SelectBox
            label="Produto"
            placeholder="Todos"
            multiple
            options={data.produtos}
            values={sel.produto}
            onChange={(v) => aplicar({ produto: v })}
          />
          <div className="pc-chip" title="Fazendas no recorte">
            <span className="material-symbols-rounded" aria-hidden="true">home_work</span>
            Fazendas: <strong>{nFazendas ? nf(nFazendas) : "–"}</strong>
          </div>
          {fullSheetHref && (
            <a href={fullSheetHref} download className="btn-table-export">
              <span className="material-symbols-rounded" style={{ fontSize: 17 }}>cloud_download</span>
              <span>Planilha completa</span>
            </a>
          )}
        </div>
        <ScreenFilters filters={["prop", "agro"]} properties={properties} agroindustries={agroindustries} />
      </div>

      {data.notice && (
        <div className="pc-aviso pc-aviso--info">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>info</span>
          <span>{data.notice}</span>
        </div>
      )}
      {data.avisos.length > 0 && (
        <div className="pc-aviso">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>warning</span>
          <span>{data.avisos.join(" ")}</span>
        </div>
      )}

      {!data.notice && (
        <>
          <div className="pc-grid">
            <SistemaPainel data={data} produto={nomeProduto} ciclo={ciclo} />
            <ProdutividadePainel porSistema={porSistema} produto={nomeProduto} ciclo={ciclo} />
          </div>

          <section className="panel-card pc-painel" aria-label="Custos de produção">
            <div className="pc-painel-head">
              <div>
                <h2>Custos de produção</h2>
                <p>
                  {composicao
                    ? `${nomeProduto} · composição do custo por etapa · ${fazLabel(data.rodape.fazendasComCusto)}${sufixoBase}`
                    : `${nomeProduto} · custo por área × custo por tonelada${sufixoBase}`}
                </p>
              </div>
              <button type="button" className="btn-pill" aria-pressed={composicao} onClick={() => setComposicao((v) => !v)} disabled={!temCusto}>
                {composicao ? "Ver custo por ha e t" : "Ver composição do custo"}
              </button>
            </div>
            {!temCusto ? (
              <div className="painel-chart-empty">Sem custo de produção consistente para os filtros selecionados.</div>
            ) : composicao ? (
              <Composicao porSistema={porSistema} rodape={data.rodape} />
            ) : (
              <div className="pc-custo-duplo">
                <div>
                  <p className="pc-mini"><b>R$/ha</b> custo por hectare</p>
                  <BarrasSistema porSistema={porSistema} campo="rsHa" unidade="R$/ha" prefixo="R$ " height={185} />
                </div>
                <div>
                  <p className="pc-mini"><b>R$/t</b> custo por tonelada produzida</p>
                  <BarrasSistema porSistema={porSistema} campo="rsT" unidade="R$/t" prefixo="R$ " height={185} />
                </div>
              </div>
            )}
          </section>

          <h2 className="painel-section-title pc-primeira-secao">Resumo por sistema de plantio</h2>
          <ResumoSistema porSistema={porSistema} data={data} />

          <h2 className="painel-section-title">Detalhe por fazenda e sistema de plantio</h2>
          <DetalheFazendas detalhe={data.detalhe} />

          <p className="pc-rodape">{rodape(data)}</p>
        </>
      )}
    </div>
  );
}

function rodape(data: PainelCustoData): string {
  const partes = ["Produtor com áreas em dois sistemas conta nos dois: os nº de fazendas por sistema não somam o total."];
  if (data.sistema.areaNaoInformada > 0) partes.push(`${nf(data.sistema.areaNaoInformada, 1)} ha sem sistema de plantio informado (fora dos percentuais).`);
  if (data.rodape.producoesDescartadas > 0) partes.push(`${nf(data.rodape.producoesDescartadas)} produções descartadas por inconsistência na origem (sem colheita, ciclo divergente ou custo fora da faixa).`);
  if (data.rodape.fazendasSemPrePlantio > 0) partes.push(`${nf(data.rodape.fazendasSemPrePlantio)} de ${nf(data.rodape.fazendasComCusto)} fazendas sem custo de pré-plantio lançado.`);
  partes.push("Fonte: Elabore (raw_custo_forrageira).");
  return partes.join(" ");
}

// ── Sistema de plantio: rosca + legenda ───────────────────────────────────────
function SistemaPainel({ data, produto, ciclo }: { data: PainelCustoData; produto: string; ciclo: string }) {
  const itens = data.sistema.itens;
  const options = useMemo<ApexOptions>(
    () => ({
      chart: { type: "donut", toolbar: { show: false }, fontFamily: "inherit", animations: { enabled: false } },
      labels: itens.map((i) => SISTEMA_ROTULO[i.sistema]),
      colors: itens.map((i) => COR_SISTEMA[i.sistema]),
      legend: { show: false },
      stroke: { width: 2, colors: ["#ffffff"] },
      // O % só aparece dentro de fatias com espaço: nunca cobre outro rótulo
      dataLabels: {
        enabled: true,
        formatter: (_v, o) => (itens[o.seriesIndex].pct >= 6 ? `${itens[o.seriesIndex].pct}%` : ""),
        style: { fontSize: "12px", fontWeight: 800, colors: ["#ffffff"] },
        dropShadow: { enabled: false },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "62%",
            labels: {
              show: true,
              name: { show: true, offsetY: 22, color: AXIS, fontSize: "11px" },
              value: { show: true, offsetY: -12, color: "#004d48", fontSize: "20px", fontWeight: 800, formatter: () => nf(data.sistema.areaTotal) },
              total: { show: true, showAlways: true, label: "hectares", color: AXIS, fontSize: "11px", formatter: () => nf(data.sistema.areaTotal) },
            },
          },
        },
      },
      tooltip: { y: { formatter: (v, o) => `${nf(v, 1)} ha (${itens[o.seriesIndex].pct}%) · ${fazLabel(itens[o.seriesIndex].fazendas)}` } },
    }),
    [itens, data.sistema.areaTotal],
  );

  return (
    <section className="panel-card pc-painel" aria-label="Sistema de plantio">
      <div className="pc-painel-head">
        <div>
          <h2>Sistema de plantio</h2>
          <p>Participação na área de {produto} ({ciclo}) · {fazLabel(data.sistema.fazendas)}</p>
        </div>
      </div>
      {data.sistema.areaTotal > 0 ? (
        <div className="pc-sistema">
          <div className="pc-donut">
            <Chart type="donut" height={215} options={options} series={itens.map((i) => i.area)} />
          </div>
          <div className="pc-sistema-lado">
            <ul className="pc-legenda">
              {itens.map((i) => (
                <li key={i.sistema}>
                  <i style={{ background: COR_SISTEMA[i.sistema] }} />
                  <span>
                    <b>{SISTEMA_ROTULO[i.sistema]}</b>
                    <small>{nf(i.area, 1)} ha · {fazLabel(i.fazendas)}</small>
                  </span>
                  <strong>{i.pct}%</strong>
                </li>
              ))}
            </ul>
            {data.sistema.conservacionistaPct !== null && (
              <div className="pc-destaque">
                <span className="material-symbols-rounded" aria-hidden="true">eco</span>
                <strong>{data.sistema.conservacionistaPct}%</strong>
                <span>da área em sistemas conservacionistas<small>Plantio direto + Cultivo mínimo</small></span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="painel-chart-empty">Sem área de plantio para os filtros selecionados.</div>
      )}
    </section>
  );
}

// ── Barras por sistema (produtividade e custos) ───────────────────────────────
function BarrasSistema({
  porSistema,
  campo,
  unidade,
  prefixo = "",
  decimals = 0,
  mostrarEixo = false,
  height = 170,
}: {
  porSistema: PorSistema[];
  campo: "tHa" | "rsHa" | "rsT";
  unidade: string;
  prefixo?: string;
  decimals?: number;
  mostrarEixo?: boolean;
  height?: number;
}) {
  const valores = porSistema.map((p) => p[campo]);
  const max = Math.max(0, ...valores.filter((v): v is number => v !== null));
  const options = useMemo<ApexOptions>(
    () => ({
      chart: { type: "bar", toolbar: { show: false }, fontFamily: "inherit", animations: { enabled: false } },
      plotOptions: { bar: { distributed: true, columnWidth: "52%", borderRadius: 5, borderRadiusApplication: "end", dataLabels: { position: "top" } } },
      colors: porSistema.map((p) => COR_SISTEMA[p.sistema]),
      // Um rótulo por barra, acima dela; a folga no eixo Y (+18%) impede o corte
      dataLabels: {
        enabled: true,
        offsetY: -20,
        formatter: (v) => (v === null || v === undefined ? "" : `${prefixo}${nf(Number(v), decimals)}`),
        style: { fontSize: "12px", fontWeight: 700, colors: [LABEL] },
        background: { enabled: false },
      },
      legend: { show: false },
      grid: { borderColor: GRID, strokeDashArray: 2, yaxis: { lines: { show: mostrarEixo } }, xaxis: { lines: { show: false } } },
      xaxis: {
        categories: porSistema.map((p) => [SISTEMA_ROTULO[p.sistema], `${fazLabel(p.fazendas, true)} · ${nf(p.areaColhida)} ha`]),
        labels: { style: { colors: porSistema.map(() => "#004d48"), fontSize: "11px", fontWeight: 600 }, rotate: 0, trim: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        max: max ? max * 1.18 : 1,
        show: mostrarEixo,
        labels: { style: { colors: AXIS, fontSize: "11px" }, formatter: (v) => nf(v) },
        title: mostrarEixo ? { text: unidade, style: { color: AXIS, fontSize: "11px", fontWeight: 500 } } : undefined,
      },
      tooltip: {
        y: {
          formatter: (v, o) => {
            const p = porSistema[o.dataPointIndex];
            return campo === "tHa"
              ? `${nf(v, 1)} t/ha · ${nf(p.toneladas)} t em ${nf(p.areaColhida, 1)} ha`
              : `${prefixo}${nf(v)} (${unidade.replace("R$/", "por ")})`;
          },
        },
      },
    }),
    [porSistema, campo, unidade, prefixo, decimals, mostrarEixo, max],
  );
  return <Chart type="bar" height={height} options={options} series={[{ name: unidade, data: valores.map((v) => v ?? 0) }]} />;
}

function ProdutividadePainel({ porSistema, produto, ciclo }: { porSistema: PorSistema[]; produto: string; ciclo: string }) {
  void ciclo;
  const faz = porSistema.reduce((a, p) => a + p.fazendas, 0);
  return (
    <section className="panel-card pc-painel" aria-label="Produtividade">
      <div className="pc-painel-head">
        <div>
          <h2>Produtividade</h2>
          <p>{produto} · toneladas colhidas por hectare · {fazLabel(faz)}</p>
        </div>
      </div>
      {porSistema.length ? (
        <BarrasSistema porSistema={porSistema} campo="tHa" unidade="t/ha" decimals={1} mostrarEixo height={215} />
      ) : (
        <div className="painel-chart-empty">Sem produção consistente para os filtros selecionados.</div>
      )}
    </section>
  );
}

// ── Composição do custo por etapa (R$/ha) ─────────────────────────────────────
function Composicao({ porSistema, rodape }: { porSistema: PorSistema[]; rodape: PainelCustoData["rodape"] }) {
  const etapas = ETAPAS.filter((e) => porSistema.some((p) => (p.etapas[e.key] ?? 0) > 0));
  const maior = Math.max(...porSistema.map((p) => etapas.reduce((a, e) => a + (p.etapas[e.key] ?? 0), 0)));
  return (
    <div className="pc-comp">
      <div className="pc-comp-legenda">
        {etapas.map((e) => (
          <span key={e.key}><i style={{ background: COR_ETAPA[e.key].cor }} />{e.label}</span>
        ))}
      </div>
      {porSistema.map((p) => {
        const vals = etapas.map((e) => p.etapas[e.key] ?? 0);
        const total = vals.reduce((a, b) => a + b, 0);
        const pcts = somaCem(vals);
        return (
          <div className="pc-comp-linha" key={p.sistema}>
            <div className="pc-comp-nome">
              <i style={{ background: COR_SISTEMA[p.sistema] }} />
              <span><b>{SISTEMA_ROTULO[p.sistema]}</b><small>{fazLabel(p.fazendas)}</small></span>
            </div>
            <div className="pc-comp-trilho">
              <div className="pc-comp-barra" style={{ width: `${maior ? (total / maior) * 100 : 0}%` }}>
                {etapas.map((e, i) =>
                  vals[i] > 0 ? (
                    <div
                      key={e.key}
                      className="pc-comp-seg"
                      style={{ flex: `${vals[i]} 1 0`, background: COR_ETAPA[e.key].cor, color: COR_ETAPA[e.key].texto }}
                      title={`${SISTEMA_ROTULO[p.sistema]} · ${e.label}: R$ ${nf(vals[i])}/ha · ${pcts[i]}% do custo`}
                    >
                      {pcts[i] >= 7 ? <span>{pcts[i]}%</span> : null}
                    </div>
                  ) : null,
                )}
              </div>
            </div>
            <strong className="pc-comp-total">R$ {nf(p.rsHa)}</strong>
          </div>
        );
      })}
      <p className="pc-comp-nota">
        {rodape.fazendasSemPrePlantio > 0
          ? `Pré-plantio não lançado separadamente por ${nf(rodape.fazendasSemPrePlantio)} de ${nf(rodape.fazendasComCusto)} fazendas. Valores em R$/ha.`
          : "Valores em R$/ha."}
      </p>
    </div>
  );
}

function somaCem(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const base = raw.map(Math.floor);
  let rest = 100 - base.reduce((a, b) => a + b, 0);
  raw.map((v, i) => [v - base[i], i] as const).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
    if (rest > 0 && values[i] > 0) {
      base[i] += 1;
      rest -= 1;
    }
  });
  return base;
}

// ── Tabelas de resumo ─────────────────────────────────────────────────────────
type LinhaSistema = {
  sistema: string;
  fazendas: number;
  area_colhida: number;
  toneladas: number;
  t_ha: number | null;
  rs_ha: number | null;
  rs_t: number | null;
  pre_plantio: number | null;
  plantio: number | null;
  tratos: number | null;
  colheita: number | null;
  nao_informada: number | null;
};

function ResumoSistema({ porSistema, data }: { porSistema: PorSistema[]; data: PainelCustoData }) {
  const area = new Map(data.sistema.itens.map((i) => [i.sistema, i]));
  const rows = porSistema.map<LinhaSistema & { area_plantada: number | null; pct_area: number | null }>((p) => ({
    sistema: SISTEMA_ROTULO[p.sistema],
    fazendas: p.fazendas,
    area_plantada: area.get(p.sistema)?.area ?? null,
    pct_area: area.get(p.sistema)?.pct ?? null,
    area_colhida: p.areaColhida,
    toneladas: p.toneladas,
    t_ha: p.tHa,
    rs_ha: p.rsHa,
    rs_t: p.rsT,
    pre_plantio: p.etapas.pre_plantio,
    plantio: p.etapas.plantio,
    tratos: p.etapas.tratos,
    colheita: p.etapas.colheita,
    nao_informada: p.etapas.nao_informada,
  }));
  type R = (typeof rows)[number];
  const columns: TabelaColuna<R>[] = [
    { key: "sistema", label: "Sistema de plantio" },
    { key: "fazendas", label: "Fazendas", align: "right" },
    { key: "area_plantada", label: "Área plantada (ha)", align: "right", decimals: 1 },
    { key: "pct_area", label: "% da área", align: "right", format: (v) => (v === null ? "—" : `${v}%`) },
    { key: "area_colhida", label: "Área colhida (ha)", align: "right", decimals: 1 },
    { key: "toneladas", label: "Toneladas", align: "right" },
    { key: "t_ha", label: "Produtividade (t/ha)", align: "right", decimals: 1 },
    { key: "rs_ha", label: "R$/ha", align: "right" },
    { key: "rs_t", label: "R$/t", align: "right" },
    { key: "pre_plantio", label: "Pré-plantio (R$/ha)", align: "right" },
    { key: "plantio", label: "Plantio (R$/ha)", align: "right" },
    { key: "tratos", label: "Tratos (R$/ha)", align: "right" },
    { key: "colheita", label: "Colheita (R$/ha)", align: "right" },
    { key: "nao_informada", label: "Não inform. (R$/ha)", align: "right" },
  ];
  return <PainelCustoTabela title="Indicadores por sistema de plantio" exportName="custo_forrageira_resumo_sistema" columns={columns} rows={rows} pageSize={10} />;
}

function DetalheFazendas({ detalhe }: { detalhe: DetalheLinha[] }) {
  const columns: TabelaColuna<DetalheLinha>[] = [
    { key: "nome_fazenda", label: "Fazenda" },
    { key: "produtor", label: "Produtor(a)" },
    { key: "consultor", label: "Consultor(a)" },
    { key: "sistema", label: "Sistema", align: "center" },
    { key: "area_plantada_ha", label: "Área plantada (ha)", align: "right", decimals: 1 },
    { key: "pct_area", label: "% da área", align: "right", format: (v) => (v === null ? "—" : `${nf(v as number, 2)}%`) },
    { key: "area_colhida_ha", label: "Área colhida (ha)", align: "right", decimals: 1 },
    { key: "toneladas", label: "Toneladas", align: "right", decimals: 1 },
    { key: "t_ha", label: "Produtividade (t/ha)", align: "right", decimals: 1 },
    { key: "rs_ha", label: "R$/ha", align: "right" },
    { key: "rs_t", label: "R$/t", align: "right" },
    { key: "custo_total", label: "Custo total (R$)", align: "right" },
    { key: "rs_pre_plantio", label: "Pré-plantio (R$/ha)", align: "right" },
    { key: "rs_plantio", label: "Plantio (R$/ha)", align: "right" },
    { key: "rs_tratos", label: "Tratos (R$/ha)", align: "right" },
    { key: "rs_colheita", label: "Colheita (R$/ha)", align: "right" },
    { key: "rs_nao_informada", label: "Não inform. (R$/ha)", align: "right" },
  ];
  return (
    <PainelCustoTabela
      title="Fazendas no recorte"
      exportName="custo_forrageira_detalhe_fazenda"
      columns={columns}
      rows={detalhe}
      pageSize={15}
      initialSort={{ key: "nome_fazenda", dir: "asc" }}
    />
  );
}
