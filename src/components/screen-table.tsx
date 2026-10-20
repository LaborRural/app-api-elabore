"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatCellValue } from "@/lib/format";
import { getNestedValue, type ColumnDef, type ScreenDef } from "@/lib/screens";
import type { AgroindustryItem, PropertySummaryItem } from "@/lib/api";
import ScreenFilters from "./screen-filters";

type Props = {
  screen: ScreenDef;
  activeTabId?: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  size: number;
  pages: number;
  properties: PropertySummaryItem[];
  agroindustries: AgroindustryItem[];
  notice?: string;
  effectivePropertyId?: string;
};

export default function ScreenTable({
  screen,
  activeTabId,
  columns,
  rows,
  total,
  page,
  size,
  pages,
  properties,
  agroindustries,
  notice,
  effectivePropertyId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") ?? "";
  const currentDir = searchParams.get("dir") ?? "asc";

  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [showColFilters, setShowColFilters] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);

  function buildUrl(updates: Record<string, string | number | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === "") {
        sp.delete(k);
      } else {
        sp.set(k, String(v));
      }
    });
    const qs = sp.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }

  function handleSort(colKey: string) {
    const nextDir = currentSort === colKey && currentDir === "asc" ? "desc" : "asc";
    router.push(buildUrl({ sort: colKey, dir: nextDir, page: 1 }));
  }

  function handleExport(formato: "csv" | "xlsx") {
    setExporting(formato);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("formato", formato);
    if (activeTabId && !sp.get("aba")) {
      sp.set("aba", activeTabId);
    }
    const url = `/api/export/${screen.slug}?${sp.toString()}`;
    window.location.href = url;
    setTimeout(() => setExporting(null), 2200);
  }

  // Filtragem rápida por coluna na página atual
  const filteredRows = rows.filter((row) =>
    Object.entries(colFilters).every(([colKey, filterVal]) => {
      if (!filterVal.trim()) return true;
      const colDef = columns.find((c) => c.key === colKey);
      const formatted = formatCellValue(getNestedValue(row, colKey), colDef?.type);
      return formatted.toLowerCase().includes(filterVal.trim().toLowerCase());
    }),
  );

  // Cálculo de páginas visíveis na barra de paginação
  const pageNumbers: number[] = [];
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(pages, startPage + 4);
  for (let p = startPage; p <= endPage; p++) {
    pageNumbers.push(p);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* CABEÇALHO DA TELA + ABAS + BOTÕES DE EXPORTAÇÃO */}
      <div className="panel-card !py-3 !px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-[var(--green-100)] px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wider text-[var(--green-800)]">
                {screen.code}
              </span>
              <span className="text-[11px] font-semibold text-[var(--muted)]">
                {screen.group}
              </span>
            </div>
            <h1 className="mt-0.5 text-lg font-extrabold tracking-tight text-[var(--ink-strong)]">
              {screen.title}
            </h1>
            <p className="text-xs text-[var(--muted)]">{screen.subtitle}</p>
          </div>

          {!screen.unavailableReason && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleExport("csv")}
                disabled={exporting !== null}
                className="btn-table-export"
                title="Baixar todos os registros filtrados em CSV (UTF-8 com BOM, separador ;)"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                  csv
                </span>
                <span>{exporting === "csv" ? "Gerando CSV…" : "Exportar CSV"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExport("xlsx")}
                disabled={exporting !== null}
                className="btn-table-export btn-table-export--primary"
                title="Baixar planilha formatada no padrão excel_format (Aptos 11, cabeçalho #247B72, listrado)"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                  download
                </span>
                <span>
                  {exporting === "xlsx" ? "Gerando XLSX…" : "Exportar XLSX (Padrão LR)"}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* SELETOR DE ABAS (quando a tela possui mais de um endpoint) */}
        {screen.tabs && screen.tabs.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[var(--line-soft)] pt-2.5">
            {screen.tabs.map((tab) => {
              const isSelected = tab.id === activeTabId;
              return (
                <Link
                  key={tab.id}
                  href={buildUrl({ aba: tab.id, page: 1, id: undefined })}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    isSelected
                      ? "bg-[#0f6e56] text-white shadow-xs"
                      : "bg-[var(--surface-soft)] text-[var(--ink)] hover:bg-[var(--green-100)] hover:text-[var(--green-900)]"
                  }`}
                >
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* BARRA DE FILTROS */}
      <ScreenFilters
        filters={screen.filters}
        properties={properties}
        agroindustries={agroindustries}
        effectivePropertyId={effectivePropertyId}
      />

      {/* AVISO / NOTA INFORMATIVA */}
      {notice && !screen.unavailableReason && (
        <div className="flex items-center gap-2.5 rounded-lg border border-[#bae6fd] bg-[#e7f3fb] px-3.5 py-2.5 text-xs font-semibold text-[#176695]">
          <span className="material-symbols-rounded shrink-0" style={{ fontSize: 18 }}>
            info
          </span>
          <span>{notice}</span>
        </div>
      )}

      {/* ESTADO INDISPONÍVEL (ex: Rateios) */}
      {screen.unavailableReason ? (
        <div className="panel-card items-center justify-center py-12 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--green-100)] text-[var(--green-800)]">
            <span className="material-symbols-rounded" style={{ fontSize: 26 }}>
              construction
            </span>
          </div>
          <h2 className="text-base font-extrabold text-[var(--ink-strong)]">
            Endpoint ainda não publicado na API
          </h2>
          <p className="mt-1 max-w-xl text-xs text-[var(--muted)] leading-relaxed">
            {screen.unavailableReason}
          </p>
        </div>
      ) : (
        /* PAINEL DA TABELA DE DADOS */
        <div className="panel-card">
          {/* Barra superior da tabela */}
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[var(--ink-strong)]">
                {total.toLocaleString("pt-BR")}{" "}
                {total === 1 ? "registro encontrado" : "registros encontrados"}
              </span>
              {Object.values(colFilters).some((v) => v.trim()) && (
                <span className="badge badge-info">
                  {filteredRows.length} visíveis no filtro de coluna
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowColFilters((v) => !v)}
                className={`inline-flex h-7 items-center gap-1 rounded border px-2.5 text-[11px] font-semibold cursor-pointer transition-colors ${
                  showColFilters
                    ? "border-[var(--metric-green)] bg-[var(--green-100)] text-[var(--green-900)]"
                    : "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--muted)] hover:text-[var(--ink-strong)]"
                }`}
                title="Exibir ou ocultar filtros individuais por coluna"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 15 }}>
                  filter_list
                </span>
                <span>Filtro por coluna</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <label htmlFor="pageSizeSelect" className="font-semibold">
                  Por página:
                </label>
                <select
                  id="pageSizeSelect"
                  value={size}
                  onChange={(e) =>
                    router.push(buildUrl({ size: Number(e.target.value), page: 1 }))
                  }
                  className="h-7 rounded border border-[var(--line)] bg-[var(--surface-soft)] px-2 text-xs font-bold text-[var(--ink-strong)] outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabela com rolagem */}
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((col) => {
                    const isSorted = currentSort === col.key;
                    const alignClass =
                      col.align === "right"
                        ? "text-right"
                        : col.align === "center"
                          ? "text-center"
                          : "text-left";
                    return (
                      <th
                        key={col.key}
                        onClick={() =>
                          col.type !== "parcelas_link" && handleSort(col.key)
                        }
                        className={`${
                          col.type !== "parcelas_link" ? "sortable" : ""
                        } ${alignClass}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span>{col.label}</span>
                          {col.type !== "parcelas_link" && (
                            <span className="text-[9.5px] opacity-60">
                              {isSorted ? (currentDir === "asc" ? "▲" : "▼") : "↕"}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>

                {showColFilters && (
                  <tr className="table-filter-row">
                    {columns.map((col) => (
                      <th key={`flt-${col.key}`}>
                        {col.type !== "parcelas_link" ? (
                          <input
                            type="text"
                            value={colFilters[col.key] ?? ""}
                            onChange={(e) =>
                              setColFilters((prev) => ({
                                ...prev,
                                [col.key]: e.target.value,
                              }))
                            }
                            placeholder={`Filtrar ${col.label.toLowerCase()}...`}
                            className="table-col-filter"
                          />
                        ) : null}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>

              <tbody>
                {filteredRows.map((row, rIdx) => (
                  <tr key={String(row.id_property ?? row.id ?? rIdx)}>
                    {columns.map((col) => {
                      const raw = getNestedValue(row, col.key);
                      const alignClass =
                        col.align === "right"
                          ? "text-right font-tabular"
                          : col.align === "center"
                            ? "text-center"
                            : "text-left";

                      if (col.type === "status") {
                        const active = raw === true;
                        return (
                          <td key={col.key} className={alignClass}>
                            <span
                              className={`badge ${
                                active ? "badge-positive" : "badge-neutral"
                              }`}
                            >
                              {active ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                        );
                      }

                      if (col.type === "boolean") {
                        return (
                          <td key={col.key} className={alignClass}>
                            {raw === true ? (
                              <span className="badge badge-info">Sim</span>
                            ) : raw === false ? (
                              <span className="badge badge-neutral">Não</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        );
                      }

                      if (col.type === "parcelas_link") {
                        const entryId = String(
                          row[col.parcelasIdKey ?? col.key] ?? "",
                        );
                        if (!entryId) {
                          return (
                            <td key={col.key} className="text-center text-[var(--muted)]">
                              —
                            </td>
                          );
                        }
                        return (
                          <td key={col.key} className="text-center">
                            <Link
                              href={`/parcelas?aba=${col.parcelasTab ?? "despesas"}&id=${entryId}`}
                              className="inline-flex items-center gap-1 rounded border border-[var(--green-200)] bg-[var(--green-050)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--green-800)] hover:bg-[var(--green-100)]"
                              title="Consultar parcelas deste lançamento"
                            >
                              <span
                                className="material-symbols-rounded"
                                style={{ fontSize: 13 }}
                              >
                                payments
                              </span>
                              <span>Parcelas</span>
                            </Link>
                          </td>
                        );
                      }

                      const formatted = formatCellValue(raw, col.type);
                      return (
                        <td
                          key={col.key}
                          className={`${alignClass} ${
                            col.key === "property_name" || col.key === "name"
                              ? "font-semibold text-[var(--ink-strong)]"
                              : ""
                          }`}
                          title={formatted !== "—" ? formatted : undefined}
                        >
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={Math.max(1, columns.length)}
                      className="py-10 text-center text-xs italic text-[var(--muted)]"
                    >
                      Nenhum registro para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Rodapé de paginação */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line-soft)] pt-3 text-xs text-[var(--muted)]">
            <div>
              Página <strong className="text-[var(--ink-strong)]">{page}</strong> de{" "}
              <strong className="text-[var(--ink-strong)]">{pages}</strong> · Exibindo{" "}
              <strong className="text-[var(--ink-strong)]">{filteredRows.length}</strong>{" "}
              itens nesta página (total:{" "}
              <strong className="text-[var(--ink-strong)]">
                {total.toLocaleString("pt-BR")}
              </strong>
              )
            </div>

            <nav className="flex items-center gap-1" aria-label="Paginação">
              <Link
                href={buildUrl({ page: 1 })}
                className={`pagination-btn ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
                title="Primeira página"
              >
                «
              </Link>
              <Link
                href={buildUrl({ page: Math.max(1, page - 1) })}
                className={`pagination-btn ${
                  page <= 1 ? "pointer-events-none opacity-40" : ""
                }`}
                title="Página anterior"
              >
                ‹ Anterior
              </Link>

              {pageNumbers.map((p) => (
                <Link
                  key={p}
                  href={buildUrl({ page: p })}
                  className={`pagination-btn ${p === page ? "active" : ""}`}
                >
                  {p}
                </Link>
              ))}

              <Link
                href={buildUrl({ page: Math.min(pages, page + 1) })}
                className={`pagination-btn ${
                  page >= pages ? "pointer-events-none opacity-40" : ""
                }`}
                title="Próxima página"
              >
                Próxima ›
              </Link>
              <Link
                href={buildUrl({ page: pages })}
                className={`pagination-btn ${
                  page >= pages ? "pointer-events-none opacity-40" : ""
                }`}
                title="Última página"
              >
                »
              </Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}

