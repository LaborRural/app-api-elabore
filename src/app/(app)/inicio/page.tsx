import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import {
  ApiAuthError,
  getAreasCatalog,
  getEntriesHeadCached,
  getPlantedCulturesCatalog,
  getPropertiesCatalog,
} from "@/lib/api";
import { formatCellValue } from "@/lib/format";
import { resolvePeriodRange } from "@/lib/screen-data";
import { MENU_GROUPS, SCREEN_LIST } from "@/lib/screens";
import { getToken } from "@/lib/session";
import { getMilkProductionTotal } from "@/lib/supabase";

type SearchProps = {
  searchParams: Promise<{ ano?: string; mes?: string }>;
};

const YEARS = ["todos", "2026", "2025", "2024", "2023", "2022"];
// Ano mais recente da lista: abre por padrão, em vez de "todos".
const DEFAULT_YEAR = YEARS[1];
export const metadata: Metadata = {
  title: "Início | API Elabore | Labor Rural",
};

// Cabeçalho e catálogo de telas aparecem na hora; só os KPIs e as tabelas esperam a API.
export default function InicioPage({ searchParams }: SearchProps) {
  return (
    <div className="flex flex-col gap-3.5">
      <Suspense fallback={<InicioHeader ano={DEFAULT_YEAR} />}>
        <InicioHeaderFromParams searchParams={searchParams} />
      </Suspense>

      <InicioDashboard searchParams={searchParams} />

      <ModulesCatalog />
    </div>
  );
}

async function InicioHeaderFromParams({ searchParams }: SearchProps) {
  const sp = await searchParams;
  return <InicioHeader ano={sp.ano ?? DEFAULT_YEAR} />;
}

function InicioHeader({ ano }: { ano: string }) {
  return (
    <div className="panel-card !py-3 !px-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="rounded bg-[var(--green-100)] px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wider text-[var(--green-800)]">
            ELB-HOME v1.0
          </span>
          <h1 className="mt-0.5 text-lg font-extrabold tracking-tight text-[var(--ink-strong)]">
            Visão Geral - Dados do Elabore
          </h1>
          <p className="text-xs text-[var(--muted)]">
            Resumo executivo das bases sincronizadas e acesso rápido às telas e exportações
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-bold uppercase text-[var(--muted)]">
            Período:
          </span>
          {YEARS.map((y) => {
            const active = ano === y;
            return (
              <Link
                key={y}
                href={y === DEFAULT_YEAR ? "/inicio" : `/inicio?ano=${y}`}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
                  active
                    ? "bg-[#0f6e56] text-white"
                    : "border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink)] hover:bg-[var(--green-100)]"
                }`}
              >
                {y === "todos" ? "Todos" : y}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Row = Record<string, unknown>;

async function authedToken(): Promise<string> {
  // Dados sempre por requisição: o cache em memória (api.ts) lê o relógio.
  await connection();
  const token = await getToken();
  if (!token) redirect("/login?expired=1");
  return token;
}

async function periodOf(searchParams: SearchProps["searchParams"]) {
  const sp = await searchParams;
  const { start, end } = resolvePeriodRange(sp.ano ?? DEFAULT_YEAR, sp.mes ?? "");
  return { start, end };
}

/** Resolve a promessa; falha da API vira null (o bloco mostra "Indisponível"), sessão expirada redireciona. */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof ApiAuthError) redirect("/login?expired=1");
    return null;
  }
}

// Garante o período no front, caso a API ignore start/end.
function inPeriod(r: Row, key: string, start: string, end: string) {
  const d = String(r[key] ?? r.reference_month ?? r.entry_date ?? "").slice(0, 10);
  return !d || (d >= start && d <= end);
}

function KpiSkeleton({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="metric-card animate-pulse">
      <div className="metric-icon">
        <span className="material-symbols-rounded">{icon}</span>
      </div>
      <span className="metric-label">{label}</span>
      <strong className="font-tabular">…</strong>
      <small>Carregando…</small>
    </div>
  );
}

function TableSkeleton({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="panel-card">
      <h2 className="text-sm font-extrabold text-[var(--ink-strong)]">{title}</h2>
      <p className="text-[11px] text-[var(--muted)]">{subtitle}</p>
      <div className="mt-3 flex animate-pulse flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-5 rounded bg-[var(--surface-soft)]" />
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  children,
}: {
  icon: string;
  label: string;
  value: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">
        <span className="material-symbols-rounded">{icon}</span>
      </div>
      <span className="metric-label">{label}</span>
      <strong className="font-tabular">{value}</strong>
      {children}
    </div>
  );
}

function InicioDashboard({ searchParams }: SearchProps) {
  return (
    <>
      {/* GRID DE KPIs (PADRÃO BI LABOR RURAL): cada card carrega e aparece sozinho */}
      <section className="kpi-grid" aria-label="Indicadores principais">
        <Suspense fallback={<KpiSkeleton icon="home_work" label="Propriedades" />}>
          <PropertiesKpi />
        </Suspense>
        <Suspense fallback={<KpiSkeleton icon="map" label="Área total" />}>
          <AreaTotalKpi />
        </Suspense>
        <Suspense fallback={<KpiSkeleton icon="grass" label="Área plantada" />}>
          <AreaPlantadaKpi />
        </Suspense>
        <Suspense fallback={<KpiSkeleton icon="water_drop" label="Produção total de leite" />}>
          <ProducaoKpi searchParams={searchParams} />
        </Suspense>
      </section>

      {/* PAINÉIS DE LANÇAMENTOS RECENTES */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <Suspense
          fallback={
            <TableSkeleton
              title="Últimos Lançamentos de Receitas"
              subtitle="Amostra dos lançamentos mais recentes do período selecionado"
            />
          }
        >
          <RecentRevenues searchParams={searchParams} />
        </Suspense>
        <Suspense
          fallback={
            <TableSkeleton
              title="Últimos Lançamentos de Despesas"
              subtitle="Amostra das despesas operacionais mais recentes do período"
            />
          }
        >
          <RecentExpenses searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

async function PropertiesKpi() {
  const token = await authedToken();
  const properties = await getPropertiesCatalog(token).catch((err) => {
    if (err instanceof ApiAuthError) redirect("/login?expired=1");
    return [];
  });
  const active = properties.filter((p) => p.is_active).length;
  return (
    <MetricCard icon="home_work" label="Propriedades ativas" value={active.toLocaleString("pt-BR")}>
      <small>{properties.length.toLocaleString("pt-BR")} na base</small>
    </MetricCard>
  );
}

const formatHa = (n: number) =>
  `${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ha`;

/** Hectares das áreas ativas: próprios + arrendados (a área em si não é contada, só seus hectares). */
async function AreaTotalKpi() {
  const token = await authedToken();
  const areas = await orNull(getAreasCatalog(token));
  if (!areas) {
    return (
      <MetricCard icon="map" label="Área total" value="Indisponível">
        <small>Falha ao consultar a API</small>
      </MetricCard>
    );
  }
  let owned = 0;
  let rented = 0;
  for (const a of areas) {
    if (a.is_active === false) continue;
    owned += Number(a.hectares_owned) || 0;
    rented += Number(a.hectares_rented) || 0;
  }
  return (
    <MetricCard icon="map" label="Área total" value={formatHa(owned + rented)}>
      <small>
        {formatHa(owned)} próprios · {formatHa(rented)} arrendados
      </small>
    </MetricCard>
  );
}

/** Hectares efetivamente plantados nas culturas ativas, com o peso sobre a área total. */
async function AreaPlantadaKpi() {
  const token = await authedToken();
  const [areas, cultures] = await Promise.all([
    orNull(getAreasCatalog(token)),
    orNull(getPlantedCulturesCatalog(token)),
  ]);
  if (!areas || !cultures) {
    return (
      <MetricCard icon="grass" label="Área plantada" value="Indisponível">
        <small>Falha ao consultar a API</small>
      </MetricCard>
    );
  }
  const total = areas
    .filter((a) => a.is_active !== false)
    .reduce((acc, a) => acc + (Number(a.hectares_owned) || 0) + (Number(a.hectares_rented) || 0), 0);
  const planted = cultures
    .filter((c) => c.is_active !== false)
    .reduce((acc, c) => acc + (Number(c.planted_area) || 0), 0);
  const pct = total > 0 ? ` · ${((planted / total) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% da área total` : "";
  return (
    <MetricCard icon="grass" label="Área plantada" value={formatHa(planted)}>
      <small>Culturas ativas{pct}</small>
    </MetricCard>
  );
}

/** Litros produzidos no período (indicadores mensais do Elabore) pelas fazendas liberadas ao usuário. */
async function ProducaoKpi({ searchParams }: SearchProps) {
  const token = await authedToken();
  const { start, end } = await periodOf(searchParams);
  const properties = await getPropertiesCatalog(token).catch(() => []);
  const codes = new Set(
    properties.filter((p) => p.labor_rural_code).map((p) => p.labor_rural_code!.trim().toUpperCase()),
  );
  const liters = await orNull(getMilkProductionTotal(start, end, codes));
  if (liters === null) {
    return (
      <MetricCard icon="water_drop" label="Produção total de leite" value="Indisponível">
        <small>Falha ao consultar os indicadores</small>
      </MetricCard>
    );
  }
  return (
    <MetricCard
      icon="water_drop"
      label="Produção total de leite"
      value={`${liters.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} L`}
    >
      <small>Soma dos indicadores mensais no período</small>
    </MetricCard>
  );
}

async function RecentRevenues({ searchParams }: SearchProps) {
  const token = await authedToken();
  const { start, end } = await periodOf(searchParams);
  const [head, properties] = await Promise.all([
    orNull(getEntriesHeadCached<Row>(token, "/revenue", start, end)),
    getPropertiesCatalog(token),
  ]);
  const propMap = new Map(properties.map((p) => [p.id_property, p.property_name]));
  const items = (head?.items ?? []).filter((r) => inPeriod(r, "reference_month", start, end));

  return (
    <div className="panel-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-[var(--ink-strong)]">
            Últimos Lançamentos de Receitas
          </h2>
          <p className="text-[11px] text-[var(--muted)]">
            Amostra dos lançamentos mais recentes do período selecionado
          </p>
        </div>
        <Link href="/receitas" className="btn-table-export">
          <span>Ver todas</span>
          <span className="material-symbols-rounded" style={{ fontSize: 15 }}>
            arrow_forward
          </span>
        </Link>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Propriedade</th>
              <th>Descrição</th>
              <th className="text-right">Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 4).map((r, i) => (
              <tr key={String(r.id_revenue_entry ?? i)}>
                <td className="text-center">{formatCellValue(r.reference_month, "date")}</td>
                <td className="font-semibold text-[var(--ink-strong)]">
                  {propMap.get(String(r.id_property ?? "")) ?? "-"}
                </td>
                <td>{String(r.description ?? r.type ?? "-")}</td>
                <td className="text-right font-tabular font-semibold">
                  {formatCellValue(r.amount_total, "currency")}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-xs italic text-[var(--muted)]">
                  {head ? "Nenhuma receita encontrada no período." : "Falha ao consultar a API."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

async function RecentExpenses({ searchParams }: SearchProps) {
  const token = await authedToken();
  const { start, end } = await periodOf(searchParams);
  const [head, properties] = await Promise.all([
    orNull(getEntriesHeadCached<Row>(token, "/expenseentry/changes", start, end)),
    getPropertiesCatalog(token),
  ]);
  const propMap = new Map(properties.map((p) => [p.id_property, p.property_name]));
  const items = (head?.items ?? []).filter((e) => inPeriod(e, "entry_date", start, end));

  return (
    <div className="panel-card">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-[var(--ink-strong)]">
            Últimos Lançamentos de Despesas
          </h2>
          <p className="text-[11px] text-[var(--muted)]">
            Amostra das despesas operacionais mais recentes do período
          </p>
        </div>
        <Link href="/despesas" className="btn-table-export">
          <span>Ver todas</span>
          <span className="material-symbols-rounded" style={{ fontSize: 15 }}>
            arrow_forward
          </span>
        </Link>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Propriedade</th>
              <th>Operação / Grupo</th>
              <th className="text-right">Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 4).map((e, i) => (
              <tr key={String(e.id_expense_entry ?? i)}>
                <td className="text-center">{formatCellValue(e.entry_date, "date")}</td>
                <td className="font-semibold text-[var(--ink-strong)]">
                  {String(e.property_name ?? propMap.get(String(e.id_property ?? "")) ?? "-")}
                </td>
                <td>{[e.tab, e.operation].filter(Boolean).map((v) => formatCellValue(v, "codigo")).join(" - ") || "-"}</td>
                <td className="text-right font-tabular font-semibold">
                  {formatCellValue(e.amount_total, "currency")}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-xs italic text-[var(--muted)]">
                  {head ? "Nenhuma despesa encontrada no período." : "Falha ao consultar a API."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModulesCatalog() {
  return (
    <div className="panel-card">
      <div className="mb-2">
        <h2 className="text-sm font-extrabold text-[var(--ink-strong)]">
          Módulos e Telas de Consulta e Exportação
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {MENU_GROUPS.map((group) => {
          const screens = SCREEN_LIST.filter((s) => s.group === group.label);
          return (
            <div
              key={group.label}
              className="flex flex-col rounded-lg border border-[var(--line-soft)] bg-[var(--surface-soft)] p-2"
            >
              <div className="mb-1.5 flex items-center gap-2 border-b border-[var(--line-soft)] pb-1.5">
                <span className="material-symbols-rounded text-[var(--green-800)]">
                  {group.icon}
                </span>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-strong)]">
                  {group.label}
                </h3>
              </div>

              <div className="flex flex-col gap-1">
                {screens.map((sc) => (
                  <div
                    key={sc.slug}
                    className="flex items-center justify-between gap-2 rounded-md border border-[var(--line-soft)] bg-[var(--surface)] px-2 py-1"
                  >
                    <Link
                      href={`/${sc.slug}`}
                      className="flex flex-col min-w-0 flex-1 hover:text-[var(--green-800)]"
                    >
                      <span className="text-xs font-bold text-[var(--ink-strong)] truncate">
                        {sc.title}
                      </span>
                    </Link>

                    {!sc.unavailableReason ? (
                      <a
                        href={`/api/export/${sc.slug}?formato=xlsx`}
                        className="inline-flex items-center gap-1 rounded bg-[var(--green-050)] border border-[var(--green-200)] px-2 py-1 text-[10px] font-bold text-[var(--green-800)] hover:bg-[var(--green-100)] shrink-0"
                        title={`Exportar ${sc.title} em XLSX`}
                      >
                        <span className="material-symbols-rounded" style={{ fontSize: 13 }}>
                          download
                        </span>
                        <span>XLSX</span>
                      </a>
                    ) : (
                      <span className="badge badge-neutral">Em breve</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
