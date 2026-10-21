"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AgroindustryItem, PropertySummaryItem } from "@/lib/api";
import type { FilterKey } from "@/lib/screens";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const YEARS = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];

type Props = {
  filters: FilterKey[];
  properties: PropertySummaryItem[];
  agroindustries: AgroindustryItem[];
  effectivePropertyId?: string;
};

type Draft = {
  ano: string;
  mes: number[];
  prop: string;
  agro: string;
  ativo: string;
  consistencia: string;
};

export type Option = { value: string; label: string };

function parseMonths(raw: string) {
  return raw
    .split(",")
    .map((m) => Number(m.trim()))
    .filter((m) => m >= 1 && m <= 12);
}

function Chevron() {
  return (
    <svg
      className="sel-chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Select no padrão Elabore: caixa com chips, botão de limpar e seta; a lista
 * abre com caixas de seleção e o item marcado fica em verde com um check.
 * `multiple` define se aceita mais de um valor ou só um (trocar substitui).
 */
export function SelectBox({
  label,
  placeholder,
  options,
  values,
  multiple = false,
  wide = false,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: Option[];
  values: string[];
  multiple?: boolean;
  /** Ocupa a linha inteira do painel e deixa o nome selecionado quebrar em vez de cortar. */
  wide?: boolean;
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTerm("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = values
    .map((v) => options.find((o) => o.value === v))
    .filter((o): o is Option => Boolean(o));

  const visible = options.filter((o) =>
    term.trim() ? o.label.toLowerCase().includes(term.trim().toLowerCase()) : true,
  );

  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange(multiple ? [...values, value] : [value]);
    }
    // A lista só fecha ao clicar fora (ver onDocClick), não ao escolher um item.
  }

  const shown = multiple && selected.length > 2 ? selected.slice(0, 2) : selected;
  const extra = selected.length - shown.length;

  return (
    <div className={`flt-field${wide ? " flt-field-wide" : ""}`} ref={rootRef}>
      <span className="flt-label">{label}</span>
      <div
        className={`sel-box ${open ? "open" : ""}`}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <div className="sel-values">
          {shown.map((o) => (
            <span key={o.value} className="sel-chip">
              <span className="sel-chip-text">{o.label}</span>
              <button
                type="button"
                className="sel-chip-x"
                aria-label={`Remover ${o.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(values.filter((v) => v !== o.value));
                }}
              >
                ×
              </button>
            </span>
          ))}
          {extra > 0 && <span className="sel-chip sel-chip-more">+{extra}</span>}
          <input
            ref={inputRef}
            className="sel-input"
            value={term}
            placeholder={selected.length === 0 ? placeholder : ""}
            aria-label={label}
            onChange={(e) => {
              setTerm(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
        </div>

        {selected.length > 0 && (
          <button
            type="button"
            className="sel-clear"
            aria-label={`Limpar ${label}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
          >
            ×
          </button>
        )}
        <Chevron />
      </div>

      {open && (
        <ul className="sel-list" role="listbox" aria-multiselectable={multiple}>
          {visible.length === 0 && <li className="sel-empty">Nenhuma opção encontrada</li>}
          {visible.map((o) => {
            const checked = values.includes(o.value);
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={checked}
                className={`sel-item ${checked ? "checked" : ""}`}
                onClick={() => toggle(o.value)}
              >
                {checked ? (
                  <svg
                    className="sel-check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                ) : (
                  <span className="sel-checkbox" aria-hidden="true" />
                )}
                <span className="sel-item-text">{o.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Campo de busca com debounce (~0,4 s); reinicia pela key quando a URL muda. */
function SearchBox({
  initial,
  onSearch,
}: {
  initial: string;
  onSearch: (q: string) => void;
}) {
  const [text, setText] = useState(initial);

  useEffect(() => {
    if (text.trim() === initial) return;
    const t = setTimeout(() => onSearch(text.trim()), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="tb-search">
      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Buscar..."
        className="tb-search-input"
        aria-label="Buscar"
      />
      <svg
        className="tb-search-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </div>
  );
}

export default function ScreenFilters({
  filters,
  properties,
  agroindustries,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlState: Draft = {
    ano: searchParams.get("ano") ?? "",
    mes: parseMonths(searchParams.get("mes") ?? ""),
    prop: searchParams.get("prop") ?? "",
    agro: searchParams.get("agro") ?? "",
    ativo: searchParams.get("ativo") ?? "",
    consistencia: searchParams.get("consistencia") ?? "",
  };
  const currentQ = searchParams.get("q") ?? "";

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(urlState);
  const wrapRef = useRef<HTMLDivElement>(null);

  const showAno = filters.includes("ano");
  const showMes = filters.includes("mes");
  const showProp = filters.includes("prop");
  const showAgro = filters.includes("agro");
  const showAtivo = filters.includes("ativo");
  const showConsistencia = filters.includes("consistencia");
  const hasPanel = showAno || showMes || showProp || showAgro || showAtivo || showConsistencia;

  const activeCount =
    (showAno && urlState.ano ? 1 : 0) +
    (showMes && urlState.mes.length > 0 ? 1 : 0) +
    (showProp && urlState.prop ? 1 : 0) +
    (showAgro && urlState.agro ? 1 : 0) +
    (showAtivo && urlState.ativo ? 1 : 0) +
    (showConsistencia && urlState.consistencia ? 1 : 0);

  function updateParams(updates: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === "todos") sp.delete(k);
      else sp.set(k, v);
    });
    sp.delete("page");
    const qs = sp.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  // Fecha o painel ao clicar fora.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (filters.length === 0) return null;

  function togglePanel() {
    if (!open) setDraft(urlState);
    setOpen((v) => !v);
  }

  function apply() {
    updateParams({
      ano: showAno ? draft.ano : undefined,
      mes: showMes && draft.mes.length > 0 ? draft.mes.join(",") : undefined,
      prop: showProp ? draft.prop : undefined,
      agro: showAgro ? draft.agro : undefined,
      ativo: showAtivo ? draft.ativo : undefined,
      consistencia: showConsistencia ? draft.consistencia : undefined,
    });
    setOpen(false);
  }

  function clearAll() {
    setDraft({ ano: "", mes: [], prop: "", agro: "", ativo: "", consistencia: "" });
    updateParams({
      ano: undefined,
      mes: undefined,
      prop: undefined,
      agro: undefined,
      ativo: undefined,
      consistencia: undefined,
    });
    setOpen(false);
  }

  const first = (v: string[]) => v[0] ?? "";

  return (
    <div ref={wrapRef} className="tb-right" aria-label="Pesquisa e filtros da tela">
      {filters.includes("q") && (
        <SearchBox
          key={currentQ}
          initial={currentQ}
          onSearch={(q) => updateParams({ q: q || undefined })}
        />
      )}

      {hasPanel && (
        <div className="flt-wrap">
          <button
            type="button"
            className="btn-filtros"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={togglePanel}
          >
            <svg
              viewBox="0 0 24 24"
              width="15"
              height="15"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filtros</span>
            <span className="btn-filtros-count">{activeCount}</span>
          </button>

          {open && (
            <div className="flt-panel" role="dialog" aria-label="Filtros">
              <div className="flt-actions">
                <button type="button" className="flt-clear" onClick={clearAll}>
                  Limpar filtros
                </button>
                <button type="button" className="flt-apply" onClick={apply}>
                  Aplicar
                </button>
              </div>

              <div className="flt-grid">
                {showAno && (
                  <SelectBox
                    label="Ano"
                    placeholder="Filtrar por ano"
                    options={YEARS.map((y) => ({ value: y, label: y }))}
                    values={draft.ano ? [draft.ano] : []}
                    onChange={(v) => setDraft((d) => ({ ...d, ano: first(v) }))}
                  />
                )}

                {showMes && (
                  <SelectBox
                    label="Mês"
                    placeholder="Filtrar por mês"
                    multiple
                    options={MONTHS.map((name, i) => ({ value: String(i + 1), label: name }))}
                    values={draft.mes.map(String)}
                    onChange={(v) =>
                      setDraft((d) => ({
                        ...d,
                        mes: v.map(Number).sort((a, b) => a - b),
                      }))
                    }
                  />
                )}

                {showAgro && (
                  <SelectBox
                    label="Agroindústria"
                    placeholder="Filtrar por agroindústria"
                    options={agroindustries.map((a) => ({
                      value: a.id_agroindustry,
                      label: a.name,
                    }))}
                    values={draft.agro ? [draft.agro] : []}
                    onChange={(v) => setDraft((d) => ({ ...d, agro: first(v) }))}
                  />
                )}

                {showProp && (
                  <SelectBox
                    label="Propriedade"
                    placeholder="Filtrar por propriedade"
                    wide
                    options={properties.map((p) => ({
                      value: p.id_property,
                      label: p.producer_name ? `${p.property_name} - ${p.producer_name}` : p.property_name,
                    }))}
                    values={draft.prop ? [draft.prop] : []}
                    onChange={(v) => setDraft((d) => ({ ...d, prop: first(v) }))}
                  />
                )}

                {showAtivo && (
                  <SelectBox
                    label="Situação"
                    placeholder="Filtrar por situação"
                    options={[
                      { value: "true", label: "Somente ativos" },
                      { value: "false", label: "Somente inativos" },
                    ]}
                    values={draft.ativo ? [draft.ativo] : []}
                    onChange={(v) => setDraft((d) => ({ ...d, ativo: first(v) }))}
                  />
                )}

                {showConsistencia && (
                  <SelectBox
                    label="Consistência"
                    placeholder="Filtrar por consistência"
                    options={[
                      { value: "CONSISTENTE", label: "Consistente" },
                      { value: "INCONSISTENTE", label: "Inconsistente" },
                      { value: "OUTLIER", label: "Outlier" },
                    ]}
                    values={draft.consistencia ? [draft.consistencia] : []}
                    onChange={(v) => setDraft((d) => ({ ...d, consistencia: first(v) }))}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
