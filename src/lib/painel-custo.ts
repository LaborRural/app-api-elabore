import "server-only";
import type { PropertySummaryItem } from "./api";
import { ETAPAS, SISTEMAS, SISTEMA_ROTULO, type EtapaKey, type PainelCustoData, type PainelCustoParams, type PorSistema, type Sistema, type DetalheLinha } from "./painel-custo-tipos";
import { resolveElaboreScope } from "./elabore-scope";
import { isInternalSession } from "./session";
import { getElaboreColumns, queryElaboreAll } from "./supabase";

// Painel de custos de forrageira: mesmas regras da tela 7 (Safra de Forrageiras) do BI gerencial,
// lidas de elabore.raw_custo_forrageira. Soma/soma por sistema de plantio (nunca média de médias),
// só de produções consistentes, custo nominal (deflacionado quando há mais de uma safra).

const TABLE = "raw_custo_forrageira";

// Regras de consistência do BI (config.yaml > safra_forrageira)
const CATEGORIAS_VALIDAS = new Set(["VOLUMOSO", "CONCENTRADO"]);
const CUSTO_MINIMO = 0.01;
const FAIXA_CUSTO_HA: [number, number] = [5000, 14000];
const FAIXA_CUSTO_T: [number, number] = [90, 500];
const CICLO_PADRAO = "1_SAFRA";
const CULTURA_PADRAO = "MILHO";
const COBERTURA_SAFRA_PADRAO = 0.5;

type Row = Record<string, unknown>;

function plain(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "");
}

function text(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

/** Maiúsculo, sem acento e sem caracteres estranhos: chave estável de comparação. */
function key(v: unknown): string {
  return text(v)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function truthy(v: unknown): boolean {
  return v === true || String(v).trim().toLowerCase() === "true";
}

function round(v: number | null, digits: number): number | null {
  if (v === null || !Number.isFinite(v)) return null;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

function div(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

function sistemaDe(v: unknown): Sistema | null {
  const k = key(v);
  if (k.startsWith("PLANTIO DIRETO")) return "PLANTIO DIRETO";
  // O dado chega às vezes com o "í" corrompido: casa por "M..NIMO"
  if (/^CULTIVO M.{0,3}NIMO/.test(k)) return "CULTIVO MINIMO";
  if (k.startsWith("CONVENCIONAL")) return "CONVENCIONAL";
  return null;
}

function cicloDe(row: Row): string {
  const k = key(text(row.cycle_efetivo) || text(row.crop_season_production));
  if (k.startsWith("1")) return "1_SAFRA";
  if (k.startsWith("2")) return "2_SAFRA";
  if (k.startsWith("3")) return "3_SAFRA";
  if (k.startsWith("PLANTAS DE COBERTURA")) return "COBERTURA";
  return "NAO_INFORMADO";
}

function culturaDe(row: Row): string {
  const k = key(row.culture_name);
  return k === "BRACHIARIA" ? "BRAQUIARIA" : k;
}

/** "25/26" -> 25 (mais nova = maior). */
function ordemSafra(s: string): number {
  const n = Number(s.slice(0, 2));
  return Number.isFinite(n) ? n : -1;
}

function titulo(v: string): string {
  const t = v.toLowerCase();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

function lista(v?: string): string[] {
  return (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
}

function distintos<T>(items: T[], pick: (t: T) => string): number {
  return new Set(items.map(pick)).size;
}

/** Percentuais inteiros que somam 100 (maior resto), como no resto do BI. */
function percentuais(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return values.map(() => 0);
  const raw = values.map((v) => (v / total) * 100);
  const base = raw.map(Math.floor);
  let rest = 100 - base.reduce((a, b) => a + b, 0);
  raw
    .map((v, i) => [v - base[i], i] as const)
    .sort((a, b) => b[0] - a[0])
    .forEach(([, i]) => {
      if (rest > 0 && values[i] > 0) {
        base[i] += 1;
        rest -= 1;
      }
    });
  return base;
}

export async function resolvePainelCusto(
  params: PainelCustoParams,
  properties: PropertySummaryItem[],
): Promise<PainelCustoData> {
  const vazio = (notice: string): PainelCustoData => ({
    notice,
    safras: [],
    culturas: [],
    produtos: [],
    selecao: { safra: [], cultura: [], produto: [] },
    custoBase: "NOMINAL",
    avisos: [],
    sistema: { areaTotal: 0, areaNaoInformada: 0, fazendas: 0, itens: [], conservacionistaPct: null },
    porSistema: [],
    detalhe: [],
    rodape: { fazendasComCusto: 0, fazendasSemPrePlantio: 0, producoesDescartadas: 0, ultimaColheita: null },
  });

  const columns = await getElaboreColumns(TABLE);
  if (columns.length === 0) {
    return vazio(`A tabela elabore.${TABLE} ainda não foi carregada pelo notebook do lr-indicadores-elabore.`);
  }

  // Escopo: só fazendas que a API libera para o usuário (+ filtros Fazenda/Agroindústria).
  // Só a sessão interna sem filtro de Fazenda/Agroindústria consulta a tabela inteira.
  const scope = resolveElaboreScope(properties, {
    internal: await isInternalSession(),
    prop: params.prop,
    agro: params.agro,
  });
  if (scope.kind === "empty") return vazio("Nenhuma fazenda disponível para os filtros escolhidos.");
  const filters: [string, string][] = [];
  if (scope.kind === "codes") filters.push(["labor_rural_code", `in.(${scope.codes.map(plain).join(",")})`]);

  const fetched = await queryElaboreAll({
    table: TABLE,
    filters,
    order: "labor_rural_code.asc,area_name.asc",
  });

  const doCiclo = fetched.filter((r) => cicloDe(r) === CICLO_PADRAO && text(r.harvest_season));
  if (doCiclo.length === 0) return vazio("Sem produções de 1ª safra para os filtros escolhidos.");

  // Consistência de cada produção (mesmas regras do BI)
  const consistente = (r: Row): boolean => {
    const ha = num(r.harvested_area);
    const kg = num(r.quantidade_kg);
    const custo = num(r.custo_total_nom);
    const cHa = ha > 0 ? custo / ha : NaN;
    const cT = kg > 0 ? custo / (kg / 1000) : NaN;
    return (
      kg > 0 &&
      ha > 0 &&
      custo >= CUSTO_MINIMO &&
      cHa >= FAIXA_CUSTO_HA[0] &&
      cHa <= FAIXA_CUSTO_HA[1] &&
      cT >= FAIXA_CUSTO_T[0] &&
      cT <= FAIXA_CUSTO_T[1] &&
      !truthy(r.sem_quantidade_produzida) &&
      !truthy(r.ciclo_divergente) &&
      !truthy(r.alerta_custo_ha) &&
      CATEGORIAS_VALIDAS.has(key(r.categoria))
    );
  };

  // ── Recorte: safra, cultura e produto ──────────────────────────────────────
  const safras = [...new Set(doCiclo.map((r) => text(r.harvest_season)))].sort((a, b) => ordemSafra(b) - ordemSafra(a));
  const consistentes = doCiclo.filter(consistente);
  const fazPorSafra = new Map<string, Set<string>>();
  for (const r of consistentes) {
    const s = text(r.harvest_season);
    if (!fazPorSafra.has(s)) fazPorSafra.set(s, new Set());
    fazPorSafra.get(s)!.add(text(r.labor_rural_code));
  }
  const maiorCobertura = Math.max(0, ...[...fazPorSafra.values()].map((s) => s.size));
  // Safra padrão: a mais recente com ao menos metade das fazendas da safra de maior cobertura
  const safraPadrao =
    safras.find((s) => (fazPorSafra.get(s)?.size ?? 0) >= maiorCobertura * COBERTURA_SAFRA_PADRAO && maiorCobertura > 0) ?? safras[0];
  let safrasSel = lista(params.safra).filter((s) => safras.includes(s));
  if (!safrasSel.length) safrasSel = [safraPadrao];
  const daSafra = doCiclo.filter((r) => safrasSel.includes(text(r.harvest_season)));

  const areaPorCultura = new Map<string, number>();
  for (const r of daSafra) areaPorCultura.set(culturaDe(r), (areaPorCultura.get(culturaDe(r)) ?? 0) + num(r.planted_area));
  const culturas = [...areaPorCultura.keys()].filter(Boolean).sort((a, b) => (areaPorCultura.get(b) ?? 0) - (areaPorCultura.get(a) ?? 0));
  let culturasSel = lista(params.cultura).map(key).filter((c) => culturas.includes(c));
  if (!culturasSel.length) culturasSel = [culturas.includes(CULTURA_PADRAO) ? CULTURA_PADRAO : culturas[0]].filter(Boolean);

  const daCultura = daSafra.filter((r) => culturasSel.includes(culturaDe(r)));
  const rotuloProduto = new Map<string, string>();
  const areaPorProduto = new Map<string, number>();
  for (const r of daCultura.filter(consistente)) {
    const k = key(r.produto_colhido);
    if (!k) continue;
    rotuloProduto.set(k, text(r.produto_colhido));
    areaPorProduto.set(k, (areaPorProduto.get(k) ?? 0) + num(r.harvested_area));
  }
  const produtos = [...areaPorProduto.keys()].sort((a, b) => (areaPorProduto.get(b) ?? 0) - (areaPorProduto.get(a) ?? 0));
  let produtosSel = lista(params.produto).map(key).filter((p) => produtos.includes(p));
  if (!produtosSel.length) produtosSel = produtos.slice(0, 1);

  const doProduto = daCultura.filter((r) => produtosSel.includes(key(r.produto_colhido)));
  const custo = doProduto.filter(consistente);

  // Base do custo: deflacionado quando compara safras, senão nominal
  const comparaSafras = safrasSel.length > 1;
  const temDefl = custo.some((r) => num(r.custo_total_defl) > 0);
  const custoBase: PainelCustoData["custoBase"] = comparaSafras && temDefl ? "DEFLACIONADO" : "NOMINAL";
  const sufixo = custoBase === "DEFLACIONADO" ? "_defl" : "_nom";
  const colCusto = (r: Row, base: string) => num(r[`${base}${sufixo}`]);
  const custoEtapa = (r: Row, e: (typeof ETAPAS)[number]) => e.cols.reduce((a, c) => a + colCusto(r, c), 0);

  const avisos: string[] = [];
  if (comparaSafras && !temDefl) avisos.push("Custo deflacionado indisponível: o custo exibido é nominal e não é comparável entre safras.");
  if (produtosSel.length > 1) avisos.push("Mais de um produto selecionado: toneladas de silagem (matéria verde) e de grão (matéria seca) não são comparáveis, então t/ha e R$/t misturam bases.");
  if (culturasSel.length > 1) avisos.push("Mais de uma cultura selecionada: produtividade e custo juntam culturas com rendimentos diferentes.");

  // ── Sistema de plantio: área plantada da cultura/safra, uma vez por plantio ───
  // (uma produção de silagem e outra de grão do mesmo plantio não duplicam a área)
  const plantios = new Map<string, Row>();
  for (const r of daCultura) {
    const id = text(r.id_planted_culture) || text(r.id_production) || `${text(r.labor_rural_code)}|${text(r.area_name)}|${text(r.harvest_season)}`;
    if (!plantios.has(id)) plantios.set(id, r);
  }
  const area = [...plantios.values()];
  const areaDe = (s: Sistema) => area.filter((r) => sistemaDe(r.sistema_plantio) === s);
  const somaArea = (rs: Row[]) => rs.reduce((a, r) => a + num(r.planted_area), 0);
  const areasSistema = SISTEMAS.map((s) => somaArea(areaDe(s)));
  const pctSistema = percentuais(areasSistema);
  const areaNaoInformada = somaArea(area.filter((r) => !sistemaDe(r.sistema_plantio)));
  const sistema: PainelCustoData["sistema"] = {
    areaTotal: round(areasSistema.reduce((a, b) => a + b, 0), 1) ?? 0,
    areaNaoInformada: round(areaNaoInformada, 1) ?? 0,
    fazendas: distintos(area.filter((r) => sistemaDe(r.sistema_plantio)), (r) => text(r.labor_rural_code)),
    itens: SISTEMAS.map((s, i) => ({
      sistema: s,
      area: round(areasSistema[i], 1) ?? 0,
      pct: pctSistema[i],
      fazendas: distintos(areaDe(s), (r) => text(r.labor_rural_code)),
    })),
    // Conservacionista = plantio direto + cultivo mínimo, sobre a área com sistema informado
    conservacionistaPct: areasSistema.some((v) => v > 0) ? pctSistema[0] + pctSistema[1] : null,
  };

  // ── Produtividade e custo por sistema (soma/soma) ────────────────────────────
  const porSistema: PorSistema[] = SISTEMAS.map((s) => {
    const rs = custo.filter((r) => sistemaDe(r.sistema_plantio) === s);
    const ha = rs.reduce((a, r) => a + num(r.harvested_area), 0);
    const t = rs.reduce((a, r) => a + num(r.quantidade_kg), 0) / 1000;
    const total = rs.reduce((a, r) => a + colCusto(r, "custo_total"), 0);
    const etapas = {} as Record<EtapaKey, number | null>;
    for (const e of ETAPAS) etapas[e.key] = round(div(rs.reduce((a, r) => a + custoEtapa(r, e), 0), ha), 0);
    return {
      sistema: s,
      fazendas: distintos(rs, (r) => text(r.labor_rural_code)),
      areaColhida: round(ha, 1) ?? 0,
      toneladas: round(t, 0) ?? 0,
      tHa: round(div(t, ha), 1),
      rsHa: round(div(total, ha), 0),
      rsT: round(div(total, t), 0),
      etapas,
    };
  });

  // ── Detalhe por fazenda × sistema ──────────────────────────────────────────
  type Acc = { codigo: string; fazenda: string; produtor: string; consultor: string; sistema: string; plantada: number; colhida: number; kg: number; total: number; etapas: Record<EtapaKey, number> };
  const acc = new Map<string, Acc>();
  const linha = (r: Row): Acc => {
    const s = sistemaDe(r.sistema_plantio);
    const k = `${text(r.labor_rural_code)}|${s ?? ""}`;
    if (!acc.has(k)) {
      acc.set(k, {
        codigo: text(r.labor_rural_code),
        fazenda: text(r.property_name) || "-",
        produtor: text(r.producer_name) || "-",
        consultor: text(r.consultant_name) || "-",
        sistema: s ? SISTEMA_ROTULO[s] : "Não informado",
        plantada: 0,
        colhida: 0,
        kg: 0,
        total: 0,
        etapas: { pre_plantio: 0, plantio: 0, tratos: 0, colheita: 0, nao_informada: 0 },
      });
    }
    return acc.get(k)!;
  };
  for (const r of area) linha(r).plantada += num(r.planted_area);
  for (const r of custo) {
    const a = linha(r);
    a.colhida += num(r.harvested_area);
    a.kg += num(r.quantidade_kg);
    a.total += colCusto(r, "custo_total");
    for (const e of ETAPAS) a.etapas[e.key] += custoEtapa(r, e);
  }
  const areaTotal = areasSistema.reduce((a, b) => a + b, 0) + areaNaoInformada;
  const detalhe: DetalheLinha[] = [...acc.values()]
    .map((a) => {
      const t = a.kg / 1000;
      return {
        codigo_lr: a.codigo,
        nome_fazenda: a.fazenda,
        produtor: a.produtor,
        consultor: a.consultor,
        sistema: a.sistema,
        area_plantada_ha: a.plantada > 0 ? round(a.plantada, 1) : null,
        pct_area: areaTotal > 0 && a.plantada > 0 ? round((a.plantada / areaTotal) * 100, 2) : null,
        area_colhida_ha: a.colhida > 0 ? round(a.colhida, 1) : null,
        toneladas: t > 0 ? round(t, 1) : null,
        t_ha: round(div(t, a.colhida), 1),
        rs_ha: round(div(a.total, a.colhida), 0),
        rs_t: round(div(a.total, t), 0),
        custo_total: a.total > 0 ? round(a.total, 0) : null,
        rs_pre_plantio: round(div(a.etapas.pre_plantio, a.colhida), 0),
        rs_plantio: round(div(a.etapas.plantio, a.colhida), 0),
        rs_tratos: round(div(a.etapas.tratos, a.colhida), 0),
        rs_colheita: round(div(a.etapas.colheita, a.colhida), 0),
        rs_nao_informada: round(div(a.etapas.nao_informada, a.colhida), 0),
      };
    })
    .sort((a, b) => a.nome_fazenda.localeCompare(b.nome_fazenda, "pt-BR"));

  const prePlantioPorFazenda = new Map<string, number>();
  for (const r of custo) {
    const c = text(r.labor_rural_code);
    prePlantioPorFazenda.set(c, (prePlantioPorFazenda.get(c) ?? 0) + colCusto(r, "etapa_pre_plantio"));
  }
  const colheitas = doProduto.map((r) => text(r.harvest_date)).filter(Boolean).sort();

  return {
    safras: safras.map((s) => ({ value: s, label: s })),
    culturas: culturas.map((c) => ({ value: c, label: titulo(c) })),
    produtos: produtos.map((p) => ({ value: p, label: rotuloProduto.get(p) ?? titulo(p) })),
    selecao: { safra: safrasSel, cultura: culturasSel, produto: produtosSel },
    custoBase,
    avisos,
    sistema,
    porSistema,
    detalhe,
    rodape: {
      fazendasComCusto: prePlantioPorFazenda.size,
      fazendasSemPrePlantio: [...prePlantioPorFazenda.values()].filter((v) => v <= 0).length,
      producoesDescartadas: doProduto.length - custo.length,
      ultimaColheita: colheitas.length ? colheitas[colheitas.length - 1] : null,
    },
  };
}
