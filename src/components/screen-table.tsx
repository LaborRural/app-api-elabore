"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { formatCellValue } from "@/lib/format";
import { getNestedValue, type ColumnDef, type ScreenDef } from "@/lib/screens";
import type { AgroindustryItem, PropertySummaryItem } from "@/lib/api";
import ScreenFilters from "./screen-filters";
import ExportMenu, { type ExportFormat } from "./export-menu";
import FullSheetButton from "./full-sheet-button";

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
  /** Download da planilha completa do SharePoint (só equipe Labor Rural, telas de Indicadores). */
  fullSheetHref?: string;
  /** Conteúdo extra no cabeçalho (ex.: alternador Tabela/Painel). */
  headerExtra?: React.ReactNode;
};

/** Setas de ordenação empilhadas (↑ sobre ↓); a direção ativa fica escura. */
function SortIcon({ dir }: { dir?: "asc" | "desc" }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  return (
    <span className="th-sort">
      <svg {...common} className={dir === "asc" ? "on" : ""}>
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
      <svg {...common} className={dir === "desc" ? "on" : ""}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="19 12 12 19 5 12" />
      </svg>
    </span>
  );
}

const PAGER_ICONS = {
  first: ["M11 7l-5 5l5 5", "M17 7l-5 5l5 5"],
  prev: ["M15 6l-6 6l6 6"],
  next: ["M9 6l6 6l-6 6"],
  last: ["M7 7l5 5l-5 5", "M13 7l5 5l-5 5"],
};

function PagerIcon({ name }: { name: keyof typeof PAGER_ICONS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PAGER_ICONS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Campo "Página [n] de N": reinicia sozinho quando a página muda (via key). */
function PageJump({
  page,
  pages,
  onGo,
}: {
  page: number;
  pages: number;
  onGo: (n: number) => void;
}) {
  const [value, setValue] = useState(String(page));

  function commit() {
    const n = Math.min(pages, Math.max(1, Math.floor(Number(value)) || page));
    setValue(String(n));
    onGo(n);
  }

  return (
    <input
      className="pager-input"
      inputMode="numeric"
      value={value}
      aria-label="Ir para a página"
      onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && commit()}
    />
  );
}

const TABELA_SUBTITLE_MAP: Record<string, string> = {
  "indicadores-mensais": "Indicadores Mensais - Tabela de Indicadores",
  "indicadores-anuais": "Indicadores Anuais - Tabela de Médias",
  "custo-forrageira": "Custo de Forrageira - Tabela de Custos",
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
  fullSheetHref,
  headerExtra,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get("sort") ?? "";
  const currentDir = searchParams.get("dir") ?? "asc";

  const [exporting, setExporting] = useState<string | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);

  function handleCancelExport() {
    exportAbortRef.current?.abort();
    exportAbortRef.current = null;
    setExporting(null);
  }

  function goToPage(n: number) {
    if (n !== page) router.push(buildUrl({ page: n }));
  }

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

  async function handleExport(formato: ExportFormat) {
    if (formato === "excel" || formato === "csv") {
      if (exporting) return;
      const targetFmt = formato === "excel" ? "xlsx" : "csv";
      const controller = new AbortController();
      exportAbortRef.current = controller;
      setExporting(formato === "excel" ? "Excel" : "CSV");
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("formato", targetFmt);
      if (activeTabId && !sp.get("aba")) {
        sp.set("aba", activeTabId);
      }
      const url = `/api/export/${screen.slug}?${sp.toString()}`;
      try {
        const res = await fetch(url, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (res.status === 401) {
          window.location.href = "/login?expired=1";
          return;
        }
        if (!res.ok) {
          throw new Error(`Falha ao exportar (${res.status})`);
        }
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
        const filename = match?.[1]
          ? decodeURIComponent(match[1])
          : `${screen.exportName}.${targetFmt}`;

        const blob = await res.blob();
        if (controller.signal.aborted) return;

        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      } catch (err) {
        if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
          return;
        }
        window.location.href = url;
      } finally {
        if (exportAbortRef.current === controller) {
          exportAbortRef.current = null;
          setExporting(null);
        }
      }
    } else if (formato === "pdf-resumido" || formato === "pdf-expandido") {
      window.print();
    }
  }

  const filteredRows = rows;
  const sizeOptions = Array.from(new Set([15, 20, 30, 40, 50, size])).sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-3">
      {/* CABEÇALHO DA TELA + SELETOR DE ABAS */}
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div>
          <h1 className="page-title">{TABELA_SUBTITLE_MAP[screen.slug] ?? screen.title}</h1>
          {screen.subtitle && <p className="page-subtitle">{screen.subtitle}</p>}
        </div>
        {headerExtra}
      </div>

      {/* ABAS SUBLINHADAS (quando a tela possui mais de um endpoint) */}
      {screen.tabs && screen.tabs.length > 0 && (
        <nav className="tabs-underline" aria-label="Abas da tela">
          {screen.tabs.map((tab) => (
            <Link
              key={tab.id}
              href={buildUrl({ aba: tab.id, page: 1, id: undefined })}
              className={`tab-underline ${tab.id === activeTabId ? "active" : ""}`}
              aria-current={tab.id === activeTabId ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      )}

      {/* BARRA: EXPORTAR (esquerda) · BUSCA + FILTROS (direita) */}
      {!screen.unavailableReason && (
        <div className="lancamentos-filtro-bar">
          <div className="lanc-filtro-esq">
            <ExportMenu
              onExport={handleExport}
              onCancel={handleCancelExport}
              disabled={exporting !== null}
              exportingFormat={exporting}
            />
            {fullSheetHref && <FullSheetButton href={fullSheetHref} />}
          </div>

          <ScreenFilters
            filters={screen.filters}
            properties={properties}
            agroindustries={agroindustries}
            effectivePropertyId={effectivePropertyId}
          />
        </div>
      )}

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
        <div className="flex flex-col">
          {/* Tabela com rolagem */}
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((col) => {
                    const isSorted = currentSort === col.key;
                    const alignClass = screen.elabore
                      ? "text-center"
                      : col.align === "right"
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
                        <span className="inline-flex items-center gap-1.5">
                          <span>{col.label}</span>
                          {col.type !== "parcelas_link" && (
                            <SortIcon
                              dir={isSorted ? (currentDir === "asc" ? "asc" : "desc") : undefined}
                            />
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row, rIdx) => (
                  <tr key={`${String(row.id ?? row.id_property ?? "")}-${rIdx}`}>
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

                      if (col.type === "consistencia") {
                        const value = String(raw ?? "").toUpperCase();
                        if (!value) {
                          return (
                            <td key={col.key} className={alignClass}>
                              -
                            </td>
                          );
                        }
                        const badgeClass =
                          value === "CONSISTENTE"
                            ? "badge-positive"
                            : value === "INCONSISTENTE"
                              ? "badge-danger"
                              : value === "OUTLIER"
                                ? "badge-warning"
                                : "badge-neutral";
                        return (
                          <td key={col.key} className={alignClass}>
                            <span className={`badge ${badgeClass}`}>{value}</span>
                          </td>
                        );
                      }

                      if (col.type === "boolean") {
                        return (
                          <td key={col.key} className={alignClass}>
                            {raw === true ? (
                              <span className="badge badge-positive">Sim</span>
                            ) : raw === false ? (
                              <span className="badge badge-danger">Não</span>
                            ) : (
                              "-"
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
                              -
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
                      // Texto longo (critérios violados, detalhamento…) aparece inteiro, quebrando linha
                      const wrap = formatted.length > 40 || col.key === "observation";
                      return (
                        <td
                          key={col.key}
                          className={`${alignClass} ${wrap ? "cell-wrap" : ""} ${
                            col.key === "property_name" || col.key === "name"
                              ? "font-semibold text-[var(--ink-strong)]"
                              : ""
                          }`}
                          title={formatted !== "-" ? formatCellValue(raw, col.type, true) : undefined}
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
          <div className="pager-bar">
            <p className="pager-total">
              Total de resultados: <strong>{total.toLocaleString("pt-BR")}</strong>
            </p>

            <nav className="pager-nav" aria-label="Paginação">
              <Link
                href={buildUrl({ page: 1 })}
                className={`pager-btn ${page <= 1 ? "disabled" : ""}`}
                title="Primeira página"
                aria-label="Primeira página"
                aria-disabled={page <= 1}
              >
                <PagerIcon name="first" />
              </Link>
              <Link
                href={buildUrl({ page: Math.max(1, page - 1) })}
                className={`pager-btn ${page <= 1 ? "disabled" : ""}`}
                title="Página anterior"
                aria-label="Página anterior"
                aria-disabled={page <= 1}
              >
                <PagerIcon name="prev" />
              </Link>
              <Link
                href={buildUrl({ page: Math.min(pages, page + 1) })}
                className={`pager-btn ${page >= pages ? "disabled" : ""}`}
                title="Próxima página"
                aria-label="Próxima página"
                aria-disabled={page >= pages}
              >
                <PagerIcon name="next" />
              </Link>
              <Link
                href={buildUrl({ page: pages })}
                className={`pager-btn ${page >= pages ? "disabled" : ""}`}
                title="Última página"
                aria-label="Última página"
                aria-disabled={page >= pages}
              >
                <PagerIcon name="last" />
              </Link>

              <span className="pager-label">Página</span>
              <PageJump key={page} page={page} pages={pages} onGo={goToPage} />
              <span className="pager-label">de {pages}</span>
            </nav>

            <label className="pager-size">
              <span>por página:</span>
              <select
                value={size}
                onChange={(e) =>
                  router.push(buildUrl({ size: Number(e.target.value), page: 1 }))
                }
              >
                {sizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
