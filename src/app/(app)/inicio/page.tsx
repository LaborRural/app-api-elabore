import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ApiAuthError,
  apiGetWithToken,
  getAgroindustriesCatalog,
  getPropertiesCatalog,
  type Page,
} from "@/lib/api";
import { formatCellValue } from "@/lib/format";
import { resolvePeriodRange } from "@/lib/screen-data";
import { MENU_GROUPS, SCREEN_LIST } from "@/lib/screens";
import { getToken } from "@/lib/session";

type SearchProps = {
  searchParams: Promise<{ ano?: string; mes?: string }>;
};

export default function InicioPage({ searchParams }: SearchProps) {
  return (
    <Suspense
      fallback={
        <div className="panel-card flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--line)] border-t-[#0f6e56]" />
            <span className="text-xs font-bold text-[var(--green-900)]">
              Carregando visão geral do Elabore…
            </span>
          </div>
        </div>
      }
    >
      <InicioContent searchParams={searchParams} />
    </Suspense>
  );
}

async function InicioContent({ searchParams }: SearchProps) {
  const token = await getToken();
  if (!token) redirect("/login?expired=1");

  const sp = await searchParams;
  const ano = sp.ano ?? "todos";
  const mes = sp.mes ?? "";
  const { start, end } = resolvePeriodRange(ano, mes);

  let properties = [];
  let agroindustries = [];
  let areasPage: Page<Record<string, unknown>> = {};
  let culturesPage: Page<Record<string, unknown>> = {};
  let revenuesPage: Page<Record<string, unknown>> = {};
  let expensesPage: Page<Record<string, unknown>> = {};

  try {
    [properties, agroindustries, areasPage, culturesPage, revenuesPage, expensesPage] =
      await Promise.all([
        getPropertiesCatalog(token),
        getAgroindustriesCatalog(token),
        apiGetWithToken<Page<Record<string, unknown>>>(token, "/areas", { page: 1, size: 1 }).catch(
          () => ({}),
        ),
        apiGetWithToken<Page<Record<string, unknown>>>(token, "/plantedculture", {
          page: 1,
          size: 1,
        }).catch(() => ({})),
        apiGetWithToken<Page<Record<string, unknown>>>(token, "/revenue", {
          start,
          end,
          page: 1,
          size: 100,
        }).catch(() => ({})),
        apiGetWithToken<Page<Record<string, unknown>>>(token, "/expenseentry/changes", {
          start,
          end,
          page: 1,
          size: 100,
        }).catch(() => ({})),
      ]);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      redirect("/login?expired=1");
    }
    throw err;
  }

  const propMap = new Map(properties.map((p) => [p.id_property, p.property_name]));
  const activeProperties = properties.filter((p) => p.is_active).length;

  const revenueItems = revenuesPage.items ?? [];
  const revenueSumSample = revenueItems.reduce(
    (acc, r) => acc + (Number(r.amount_total) || 0),
    0,
  );

  const expenseItems = expensesPage.items ?? [];
  const expenseSumSample = expenseItems.reduce(
    (acc, r) => acc + (Number(r.amount_total) || 0),
    0,
  );

  const years = ["todos", "2026", "2025", "2024", "2023", "2022"];

  return (
    <div className="flex flex-col gap-3.5">
      {/* CABEÇALHO DO PAINEL INICIAL */}
      <div className="panel-card !py-3 !px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="rounded bg-[var(--green-100)] px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wider text-[var(--green-800)]">
              ELB-HOME v1.0
            </span>
            <h1 className="mt-0.5 text-lg font-extrabold tracking-tight text-[var(--ink-strong)]">
              Visão Geral — Dados do Elabore
            </h1>
            <p className="text-xs text-[var(--muted)]">
              Resumo executivo das bases sincronizadas e acesso rápido às telas e exportações
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-bold uppercase text-[var(--muted)]">
              Período:
            </span>
            {years.map((y) => {
              const active = ano === y;
              return (
                <Link
                  key={y}
                  href={y === "todos" ? "/inicio" : `/inicio?ano=${y}`}
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

      {/* GRID DE KPIs (PADRÃO BI LABOR RURAL) */}
      <section className="kpi-grid" aria-label="Indicadores principais">
        <div className="metric-card">
          <div className="metric-icon">
            <span className="material-symbols-rounded">home_work</span>
          </div>
          <span className="metric-label">Propriedades</span>
          <strong className="font-tabular">{properties.length.toLocaleString("pt-BR")}</strong>
          <small>{activeProperties} ativas na base</small>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <span className="material-symbols-rounded">factory</span>
          </div>
          <span className="metric-label">Agroindústrias</span>
          <strong className="font-tabular">{agroindustries.length.toLocaleString("pt-BR")}</strong>
          <small>Parceiras cadastradas</small>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <span className="material-symbols-rounded">map</span>
          </div>
          <span className="metric-label">Áreas Rurais</span>
          <strong className="font-tabular">
            {(areasPage.total ?? 0).toLocaleString("pt-BR")}
          </strong>
          <small>{(culturesPage.total ?? 0).toLocaleString("pt-BR")} culturas plantadas</small>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <span className="material-symbols-rounded">trending_up</span>
          </div>
          <span className="metric-label">Receitas no Período</span>
          <strong className="font-tabular">
            {(revenuesPage.total ?? revenueItems.length).toLocaleString("pt-BR")} lanç.
          </strong>
          <small>
            Amostra recente: {formatCellValue(revenueSumSample, "currency")}
          </small>
        </div>

        <div className="metric-card">
          <div className="metric-icon">
            <span className="material-symbols-rounded">trending_down</span>
          </div>
          <span className="metric-label">Despesas no Período</span>
          <strong className="font-tabular">
            {(expensesPage.total ?? expenseItems.length).toLocaleString("pt-BR")} lanç.
          </strong>
          <small>
            Amostra recente: {formatCellValue(expenseSumSample, "currency")}
          </small>
        </div>
      </section>

      {/* PAINÉIS DE LANÇAMENTOS RECENTES */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        {/* Últimas Receitas */}
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
                  <th>Competência</th>
                  <th>Propriedade</th>
                  <th>Descrição</th>
                  <th className="text-right">Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                {revenueItems.slice(0, 6).map((r, i) => (
                  <tr key={String(r.id_revenue_entry ?? i)}>
                    <td className="text-center">
                      {formatCellValue(r.reference_month, "date")}
                    </td>
                    <td className="font-semibold text-[var(--ink-strong)]">
                      {propMap.get(String(r.id_property ?? "")) ?? "—"}
                    </td>
                    <td>{String(r.description ?? r.type ?? "—")}</td>
                    <td className="text-right font-tabular font-semibold">
                      {formatCellValue(r.amount_total, "currency")}
                    </td>
                  </tr>
                ))}
                {revenueItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs italic text-[var(--muted)]">
                      Nenhuma receita encontrada no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Últimas Despesas */}
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
                {expenseItems.slice(0, 6).map((e, i) => (
                  <tr key={String(e.id_expense_entry ?? i)}>
                    <td className="text-center">{formatCellValue(e.entry_date, "date")}</td>
                    <td className="font-semibold text-[var(--ink-strong)]">
                      {String(
                        e.property_name ?? propMap.get(String(e.id_property ?? "")) ?? "—",
                      )}
                    </td>
                    <td>{String(e.operation ?? e.tab ?? "—")}</td>
                    <td className="text-right font-tabular font-semibold">
                      {formatCellValue(e.amount_total, "currency")}
                    </td>
                  </tr>
                ))}
                {expenseItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-xs italic text-[var(--muted)]">
                      Nenhuma despesa encontrada no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CATÁLOGO DE TELAS DO ELABORE */}
      <div className="panel-card">
        <div className="mb-3">
          <h2 className="text-sm font-extrabold text-[var(--ink-strong)]">
            Módulos e Telas de Consulta e Exportação
          </h2>
          <p className="text-[11px] text-[var(--muted)]">
            Acesse qualquer módulo do Elabore para aplicar filtros avançados e exportar em CSV ou
            XLSX formatado
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {MENU_GROUPS.map((group) => {
            const screens = SCREEN_LIST.filter((s) => s.group === group.label);
            return (
              <div
                key={group.label}
                className="flex flex-col rounded-lg border border-[var(--line-soft)] bg-[var(--surface-soft)] p-3"
              >
                <div className="mb-2 flex items-center gap-2 border-b border-[var(--line-soft)] pb-2">
                  <span className="material-symbols-rounded text-[var(--green-800)]">
                    {group.icon}
                  </span>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--ink-strong)]">
                    {group.label}
                  </h3>
                </div>

                <div className="flex flex-col gap-1.5">
                  {screens.map((sc) => (
                    <div
                      key={sc.slug}
                      className="flex items-center justify-between gap-2 rounded-md border border-[var(--line-soft)] bg-[var(--surface)] px-2.5 py-2"
                    >
                      <Link
                        href={`/${sc.slug}`}
                        className="flex flex-col min-w-0 flex-1 hover:text-[var(--green-800)]"
                      >
                        <span className="text-xs font-bold text-[var(--ink-strong)] truncate">
                          {sc.title}
                        </span>
                        <span className="text-[10px] text-[var(--muted)] truncate">
                          {sc.code}
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
    </div>
  );
}

