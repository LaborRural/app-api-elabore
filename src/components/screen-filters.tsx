"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AgroindustryItem, PropertySummaryItem } from "@/lib/api";
import type { FilterKey } from "@/lib/screens";

const MONTHS = [
  { value: 1, label: "Janeiro", short: "Jan" },
  { value: 2, label: "Fevereiro", short: "Fev" },
  { value: 3, label: "Março", short: "Mar" },
  { value: 4, label: "Abril", short: "Abr" },
  { value: 5, label: "Maio", short: "Mai" },
  { value: 6, label: "Junho", short: "Jun" },
  { value: 7, label: "Julho", short: "Jul" },
  { value: 8, label: "Agosto", short: "Ago" },
  { value: 9, label: "Setembro", short: "Set" },
  { value: 10, label: "Outubro", short: "Out" },
  { value: 11, label: "Novembro", short: "Nov" },
  { value: 12, label: "Dezembro", short: "Dez" },
];

const YEARS = ["todos", "2026", "2025", "2024", "2023", "2022", "2021", "2020"];

type Props = {
  filters: FilterKey[];
  properties: PropertySummaryItem[];
  agroindustries: AgroindustryItem[];
  effectivePropertyId?: string;
};

export default function ScreenFilters({
  filters,
  properties,
  agroindustries,
  effectivePropertyId,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentAno = searchParams.get("ano") ?? "todos";
  const currentMesRaw = searchParams.get("mes") ?? "";
  const currentProp = searchParams.get("prop") ?? effectivePropertyId ?? "";
  const currentAgro = searchParams.get("agro") ?? "";
  const currentAtivo = searchParams.get("ativo") ?? "";
  const currentQ = searchParams.get("q") ?? "";
  const currentId = searchParams.get("id") ?? "";

  const [qText, setQText] = useState(currentQ);
  const [idText, setIdText] = useState(currentId);
  const [openPopup, setOpenPopup] = useState<string | null>(null);
  const [propSearch, setPropSearch] = useState("");
  const [agroSearch, setAgroSearch] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<number[]>(() =>
    currentMesRaw
      .split(",")
      .map((m) => Number(m.trim()))
      .filter((m) => m >= 1 && m <= 12),
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQText(currentQ);
  }, [currentQ]);

  useEffect(() => {
    setIdText(currentId);
  }, [currentId]);

  useEffect(() => {
    setSelectedMonths(
      currentMesRaw
        .split(",")
        .map((m) => Number(m.trim()))
        .filter((m) => m >= 1 && m <= 12),
    );
  }, [currentMesRaw]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPopup(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (filters.length === 0) return null;

  function updateParams(updates: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === "todos") {
        sp.delete(k);
      } else {
        sp.set(k, v);
      }
    });
    sp.delete("page"); // volta para página 1 ao filtrar
    const qs = sp.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function clearAllFilters() {
    const sp = new URLSearchParams();
    const aba = searchParams.get("aba");
    const size = searchParams.get("size");
    if (aba) sp.set("aba", aba);
    if (size) sp.set("size", size);
    const qs = sp.toString();
    setQText("");
    setIdText("");
    setSelectedMonths([]);
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  const hasActiveFilters = Boolean(
    (currentAno && currentAno !== "todos") ||
      currentMesRaw ||
      searchParams.get("prop") ||
      currentAgro ||
      currentAtivo ||
      currentQ ||
      currentId,
  );

  // Rótulo do seletor de meses
  const mesDisplay =
    selectedMonths.length === 0
      ? "Todos os meses"
      : selectedMonths.length <= 3
        ? selectedMonths
            .map((m) => MONTHS.find((x) => x.value === m)?.short ?? m)
            .join(", ")
        : `${selectedMonths.length} meses selecionados`;

  const selectedPropName =
    properties.find((p) => p.id_property === currentProp)?.property_name ??
    "Todas as Propriedades";

  const selectedAgroName =
    agroindustries.find((a) => a.id_agroindustry === currentAgro)?.name ??
    "Todas as Agroindústrias";

  const filteredProps = properties.filter((p) => {
    if (!propSearch.trim()) return true;
    const term = propSearch.toLowerCase();
    return (
      p.property_name.toLowerCase().includes(term) ||
      (p.city ?? "").toLowerCase().includes(term) ||
      (p.labor_rural_code ?? "").toLowerCase().includes(term)
    );
  });

  const filteredAgros = agroindustries.filter((a) => {
    if (!agroSearch.trim()) return true;
    const term = agroSearch.toLowerCase();
    return (
      a.name.toLowerCase().includes(term) ||
      a.razao_social.toLowerCase().includes(term) ||
      a.cnpj.toLowerCase().includes(term)
    );
  });

  return (
    <section ref={containerRef} className="filter-bar-card" aria-label="Filtros da tela">
      {/* FILTRO: ANO */}
      {filters.includes("ano") && (
        <div
          className={`filter-control ${openPopup === "ano" ? "active-popup" : ""}`}
          style={{ maxWidth: 145 }}
          onClick={() => setOpenPopup(openPopup === "ano" ? null : "ano")}
        >
          <span className="filter-label">Ano</span>
          <div className="select-display-value">
            {currentAno === "todos" ? "Todos os anos" : currentAno}
          </div>
          {openPopup === "ano" && (
            <div className="custom-select-popup" onClick={(e) => e.stopPropagation()}>
              <div className="custom-select-options-list">
                {YEARS.map((y) => (
                  <div
                    key={y}
                    className={`custom-select-option ${currentAno === y ? "selected" : ""}`}
                    onClick={() => {
                      updateParams({ ano: y });
                      setOpenPopup(null);
                    }}
                  >
                    <span>{y === "todos" ? "Todos os anos" : y}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILTRO: MÊS (MULTI-SELEÇÃO) */}
      {filters.includes("mes") && (
        <div
          className={`filter-control ${openPopup === "mes" ? "active-popup" : ""}`}
          style={{ maxWidth: 185 }}
          onClick={() => setOpenPopup(openPopup === "mes" ? null : "mes")}
        >
          <span className="filter-label">Mês (Multi-seleção)</span>
          <div className="select-display-value">{mesDisplay}</div>
          {openPopup === "mes" && (
            <div className="custom-select-popup" onClick={(e) => e.stopPropagation()}>
              <div className="custom-select-options-list">
                <div
                  className={`custom-select-option ${
                    selectedMonths.length === 0 ? "selected" : ""
                  }`}
                  onClick={() => setSelectedMonths([])}
                >
                  <span>Todos os meses</span>
                </div>
                {MONTHS.map((m) => {
                  const checked = selectedMonths.includes(m.value);
                  return (
                    <div
                      key={m.value}
                      className={`custom-select-option ${checked ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedMonths((prev) =>
                          prev.includes(m.value)
                            ? prev.filter((x) => x !== m.value)
                            : [...prev, m.value].sort((a, b) => a - b),
                        );
                      }}
                    >
                      <span>{m.label}</span>
                      <span className="text-xs font-bold">{checked ? "✓" : ""}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex items-center justify-end gap-2 border-t border-[var(--line-soft)] pt-2">
                <button
                  type="button"
                  className="rounded px-2.5 py-1 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-soft)] cursor-pointer"
                  onClick={() => setSelectedMonths([])}
                >
                  Limpar
                </button>
                <button
                  type="button"
                  className="rounded bg-[#0f6e56] px-3 py-1 text-xs font-bold text-white hover:bg-[#004d49] cursor-pointer"
                  onClick={() => {
                    updateParams({
                      mes: selectedMonths.length > 0 ? selectedMonths.join(",") : undefined,
                    });
                    setOpenPopup(null);
                  }}
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILTRO: PROPRIEDADE (COM PESQUISA INTERNA) */}
      {filters.includes("prop") && (
        <div
          className={`filter-control filter-control--wide ${
            openPopup === "prop" ? "active-popup" : ""
          }`}
          onClick={() => setOpenPopup(openPopup === "prop" ? null : "prop")}
        >
          <span className="filter-label">Propriedade</span>
          <div className="select-display-value">{selectedPropName}</div>
          {openPopup === "prop" && (
            <div className="custom-select-popup" onClick={(e) => e.stopPropagation()}>
              <div className="custom-select-search-wrap">
                <input
                  type="text"
                  value={propSearch}
                  onChange={(e) => setPropSearch(e.target.value)}
                  placeholder="Pesquisar propriedade ou cidade..."
                  className="custom-select-search-input"
                  autoFocus
                />
              </div>
              <div className="custom-select-options-list">
                <div
                  className={`custom-select-option ${!currentProp ? "selected" : ""}`}
                  onClick={() => {
                    updateParams({ prop: undefined });
                    setOpenPopup(null);
                  }}
                >
                  <span>Todas as Propriedades ({properties.length})</span>
                </div>
                {filteredProps.map((p) => (
                  <div
                    key={p.id_property}
                    className={`custom-select-option ${
                      currentProp === p.id_property ? "selected" : ""
                    }`}
                    onClick={() => {
                      updateParams({ prop: p.id_property });
                      setOpenPopup(null);
                    }}
                  >
                    <span className="truncate">{p.property_name}</span>
                    {p.city && (
                      <small className="opacity-75 shrink-0">
                        {p.city}/{p.uf ?? ""}
                      </small>
                    )}
                  </div>
                ))}
                {filteredProps.length === 0 && (
                  <div className="p-3 text-center text-xs italic text-[var(--muted)]">
                    Nenhuma propriedade encontrada
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILTRO: AGROINDÚSTRIA (COM PESQUISA INTERNA) */}
      {filters.includes("agro") && (
        <div
          className={`filter-control filter-control--wide ${
            openPopup === "agro" ? "active-popup" : ""
          }`}
          onClick={() => setOpenPopup(openPopup === "agro" ? null : "agro")}
        >
          <span className="filter-label">Agroindústria</span>
          <div className="select-display-value">{selectedAgroName}</div>
          {openPopup === "agro" && (
            <div className="custom-select-popup" onClick={(e) => e.stopPropagation()}>
              <div className="custom-select-search-wrap">
                <input
                  type="text"
                  value={agroSearch}
                  onChange={(e) => setAgroSearch(e.target.value)}
                  placeholder="Pesquisar agroindústria..."
                  className="custom-select-search-input"
                  autoFocus
                />
              </div>
              <div className="custom-select-options-list">
                <div
                  className={`custom-select-option ${!currentAgro ? "selected" : ""}`}
                  onClick={() => {
                    updateParams({ agro: undefined });
                    setOpenPopup(null);
                  }}
                >
                  <span>Todas as Agroindústrias ({agroindustries.length})</span>
                </div>
                {filteredAgros.map((a) => (
                  <div
                    key={a.id_agroindustry}
                    className={`custom-select-option ${
                      currentAgro === a.id_agroindustry ? "selected" : ""
                    }`}
                    onClick={() => {
                      updateParams({ agro: a.id_agroindustry });
                      setOpenPopup(null);
                    }}
                  >
                    <span className="truncate">{a.name}</span>
                    {a.uf && <small className="opacity-75 shrink-0">{a.uf}</small>}
                  </div>
                ))}
                {filteredAgros.length === 0 && (
                  <div className="p-3 text-center text-xs italic text-[var(--muted)]">
                    Nenhuma agroindústria encontrada
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILTRO: SITUAÇÃO (ATIVO / INATIVO) */}
      {filters.includes("ativo") && (
        <div
          className={`filter-control ${openPopup === "ativo" ? "active-popup" : ""}`}
          style={{ maxWidth: 150 }}
          onClick={() => setOpenPopup(openPopup === "ativo" ? null : "ativo")}
        >
          <span className="filter-label">Situação</span>
          <div className="select-display-value">
            {currentAtivo === "true"
              ? "Somente Ativos"
              : currentAtivo === "false"
                ? "Somente Inativos"
                : "Todas"}
          </div>
          {openPopup === "ativo" && (
            <div className="custom-select-popup" onClick={(e) => e.stopPropagation()}>
              <div className="custom-select-options-list">
                {[
                  { val: "", label: "Todas as situações" },
                  { val: "true", label: "Somente Ativos" },
                  { val: "false", label: "Somente Inativos" },
                ].map((opt) => (
                  <div
                    key={opt.val}
                    className={`custom-select-option ${currentAtivo === opt.val ? "selected" : ""}`}
                    onClick={() => {
                      updateParams({ ativo: opt.val || undefined });
                      setOpenPopup(null);
                    }}
                  >
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FILTRO: ID DE LANÇAMENTO (TELA PARCELAS) */}
      {filters.includes("lancamento") && (
        <form
          className="filter-control filter-control--wide"
          onSubmit={(e) => {
            e.preventDefault();
            updateParams({ id: idText.trim() || undefined });
          }}
        >
          <label htmlFor="fltLancamento">ID do Lançamento (opcional)</label>
          <div className="flex items-center gap-1">
            <input
              id="fltLancamento"
              type="text"
              value={idText}
              onChange={(e) => setIdText(e.target.value)}
              placeholder="Todos do período (ou cole o UUID)..."
              className="w-full border-0 bg-transparent text-[11.5px] font-semibold text-[var(--ink-strong)] outline-none placeholder:font-normal placeholder:text-[var(--muted)]"
            />
            {currentId && (
              <button
                type="button"
                onClick={() => {
                  setIdText("");
                  updateParams({ id: undefined });
                }}
                className="text-xs font-bold text-[var(--muted)] hover:text-[var(--danger)] cursor-pointer"
                title="Remover filtro de lançamento"
              >
                ✕
              </button>
            )}
          </div>
        </form>
      )}

      {/* FILTRO: BUSCA POR TEXTO */}
      {filters.includes("q") && (
        <form
          className="filter-control filter-control--wide"
          onSubmit={(e) => {
            e.preventDefault();
            updateParams({ q: qText.trim() || undefined });
          }}
        >
          <label htmlFor="fltTexto">Busca por texto</label>
          <div className="flex items-center gap-1">
            <input
              id="fltTexto"
              type="search"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
              placeholder="Digite e pressione Enter..."
              className="w-full border-0 bg-transparent text-[11.5px] font-semibold text-[var(--ink-strong)] outline-none placeholder:font-normal placeholder:text-[var(--muted)]"
            />
            <button
              type="submit"
              className="text-[var(--green-800)] hover:text-[var(--green-950)] cursor-pointer"
              title="Buscar texto"
              aria-label="Buscar texto"
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                search
              </span>
            </button>
          </div>
        </form>
      )}

      {/* BOTÃO LIMPAR FILTROS */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="inline-flex h-[38px] items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-3 text-xs font-bold text-[var(--muted)] hover:border-[#fecaca] hover:bg-[#feebe9] hover:text-[#991b1b] cursor-pointer transition-colors"
          title="Limpar todos os filtros aplicados"
        >
          <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
            filter_alt_off
          </span>
          <span>Limpar</span>
        </button>
      )}
    </section>
  );
}

