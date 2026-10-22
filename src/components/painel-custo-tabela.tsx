"use client";

import { useMemo, useState } from "react";

// Tabela de resumo do painel de custos: pesquisa por coluna, ordenação, paginação e CSV
// (padrão LRTable da skill lr-dashboards, na versão React).

export type TabelaColuna<T> = {
  key: keyof T & string;
  label: string;
  align?: "left" | "center" | "right";
  /** Texto exibido (e exportado); padrão: número em pt-BR ou o próprio valor. */
  format?: (value: T[keyof T & string], row: T) => string;
  /** Casas decimais para colunas numéricas sem `format`. */
  decimals?: number;
};

type Props<T> = {
  title: string;
  exportName: string;
  columns: TabelaColuna<T>[];
  rows: T[];
  pageSize?: number;
  initialSort?: { key: keyof T & string; dir: "asc" | "desc" };
  /** Linha de totais fixa no rodapé da tabela (já formatada). */
  footer?: Partial<Record<keyof T & string, string>>;
};

const PAGE_SIZES = [10, 25, 50, 100];

function norm(v: string): string {
  return v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function show<T>(col: TabelaColuna<T>, row: T): string {
  const v = row[col.key];
  if (col.format) return col.format(v, row);
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "number") {
    const d = col.decimals ?? 0;
    return v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  return String(v);
}

function compare(a: unknown, b: unknown): number {
  const na = a === null || a === undefined || a === "";
  const nb = b === null || b === undefined || b === "";
  if (na || nb) return na === nb ? 0 : na ? 1 : -1; // vazios sempre no fim
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR");
}

export default function PainelCustoTabela<T extends object>({ title, exportName, columns, rows, pageSize = 10, initialSort, footer }: Props<T>) {
  const [sort, setSort] = useState(initialSort ?? null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [size, setSize] = useState(pageSize);
  const [page, setPage] = useState(1);

  const visible = useMemo(() => {
    const active = Object.entries(filters).filter(([, v]) => v.trim());
    let out = rows.filter((row) =>
      active.every(([k, term]) => {
        const col = columns.find((c) => c.key === k);
        if (!col) return true;
        // O termo precisa começar uma palavra ("silva" acha "João Silva"), sem acento e sem caixa
        const text = norm(show(col, row));
        const t = norm(term.trim());
        return text.startsWith(t) || text.includes(` ${t}`);
      }),
    );
    if (sort) {
      const dir = sort.dir === "asc" ? 1 : -1;
      const empty = (v: unknown) => v === null || v === undefined || v === "";
      out = [...out].sort((a, b) => {
        const va = a[sort.key];
        const vb = b[sort.key];
        if (empty(va) || empty(vb)) return compare(va, vb); // vazios no fim nos dois sentidos
        return dir * compare(va, vb);
      });
    }
    return out;
  }, [rows, filters, sort, columns]);

  const pages = Math.max(1, Math.ceil(visible.length / size));
  const current = Math.min(page, pages);
  const slice = visible.slice((current - 1) * size, current * size);
  const from = visible.length ? (current - 1) * size + 1 : 0;

  function toggleSort(key: keyof T & string) {
    setSort((s) => (s?.key === key ? (s.dir === "asc" ? { key, dir: "desc" } : null) : { key, dir: "asc" }));
  }

  function exportCsv() {
    const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const body = visible.map((row) => columns.map((c) => esc(show(c, row) === "-" ? "" : show(c, row))).join(";"));
    const csv = `﻿${[columns.map((c) => esc(c.label)).join(";"), ...body].join("\r\n")}`;
    const now = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}_${p(now.getMonth() + 1)}_${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stamp}_${exportName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pageButtons = useMemo(() => {
    const set = new Set([1, pages, current - 1, current, current + 1]);
    return [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  }, [pages, current]);

  return (
    <section className="panel-card pc-tabela">
      <div className="pc-tabela-head">
        <h3>{title}</h3>
        <span className="record-count">{visible.length.toLocaleString("pt-BR")} {visible.length === 1 ? "registro" : "registros"}</span>
        <button type="button" className="btn-table-export" onClick={exportCsv} disabled={!visible.length}>
          <span className="material-symbols-rounded" style={{ fontSize: 17 }}>download</span>
          <span>Exportar</span>
        </button>
      </div>

      <div className="table-scroll">
        <table className="data-table pc-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`col-${c.align ?? "left"}`} onClick={() => toggleSort(c.key)} aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
                  <span>{c.label}</span>
                  <i className={`pc-sort ${sort?.key === c.key ? "on" : ""}`}>{sort?.key === c.key ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}</i>
                </th>
              ))}
            </tr>
            <tr className="table-filter-row">
              {columns.map((c) => (
                <th key={c.key}>
                  <input
                    type="text"
                    className="table-col-filter"
                    placeholder="Filtrar..."
                    aria-label={`Filtrar ${c.label}`}
                    value={filters[c.key] ?? ""}
                    onChange={(e) => {
                      setFilters((f) => ({ ...f, [c.key]: e.target.value }));
                      setPage(1);
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr><td colSpan={columns.length} className="empty-cell">Nenhum registro para os filtros selecionados.</td></tr>
            ) : (
              slice.map((row, i) => (
                <tr key={i}>
                  {columns.map((c) => {
                    const text = show(c, row);
                    return <td key={c.key} className={`col-${c.align ?? "left"}`} title={text}>{text}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
          {footer && slice.length > 0 && (
            <tfoot>
              <tr>
                {columns.map((c, i) => (
                  <td key={c.key} className={`col-${c.align ?? "left"}`}>{footer[c.key] ?? (i === 0 ? "Total" : "")}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="pc-pager">
        <span>Exibindo <b>{from}–{Math.min(current * size, visible.length)}</b> de <b>{visible.length.toLocaleString("pt-BR")}</b></span>
        <label>
          Exibir:{" "}
          <select value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}>
            {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="pc-pager-btns">
          <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} aria-label="Página anterior">‹</button>
          {pageButtons.map((n, i) => (
            <span key={n} className="pc-pager-item">
              {i > 0 && n - pageButtons[i - 1] > 1 && <em>…</em>}
              <button type="button" className={n === current ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
            </span>
          ))}
          <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} aria-label="Próxima página">›</button>
        </div>
      </div>
    </section>
  );
}
