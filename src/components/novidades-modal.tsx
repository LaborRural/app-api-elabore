"use client";

import { useEffect } from "react";
import { NOVIDADES, VERSAO, type TipoNovidade } from "@/lib/version";

interface NovidadesModalProps {
  open: boolean;
  onClose: () => void;
}

const BADGE_CONFIG: Record<TipoNovidade, { label: string; className: string }> = {
  novo: {
    label: "Novo",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
  },
  melhorou: {
    label: "Melhorou",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800",
  },
  corrigido: {
    label: "Corrigido",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800",
  },
};

export default function NovidadesModal({ open, onClose }: NovidadesModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="novidades-modal-titulo"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-[var(--panel,#ffffff)] text-[var(--text,#1e293b)] border border-[var(--line,#e2e8f0)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[var(--line,#e2e8f0)] bg-[var(--panel2,#f8fafc)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--brand,#004d49)] text-white shadow-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
            </div>
            <div>
              <h2 id="novidades-modal-titulo" className="text-base font-bold text-[var(--brand-dark,#0f172a)] leading-tight">
                Novidades do Aplicativo
              </h2>
              <span className="text-xs text-[var(--muted,#64748b)]">
                Versão atual instalada: <strong className="font-semibold text-[var(--brand,#004d49)]">v{VERSAO}</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--text,#1e293b)] hover:bg-[var(--line-soft,#e2e8f0)] transition-colors"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Lista de versões */}
        <div className="overflow-y-auto px-6 py-5 divide-y divide-[var(--line-soft,#f1f5f9)] space-y-6">
          {NOVIDADES.map((nov, idx) => (
            <div key={nov.versao} className={idx > 0 ? "pt-5" : ""}>
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--brand-2,#0f6e56)] text-white tracking-wide">
                    v{nov.versao}
                  </span>
                  <span className="text-sm font-semibold text-[var(--brand-dark,#0f172a)]">
                    {nov.titulo}
                  </span>
                </div>
                <time className="text-[11px] text-[var(--muted,#64748b)] tabular-nums">
                  {nov.data}
                </time>
              </div>

              <ul className="space-y-2 mt-2">
                {nov.itens.map((item, itemIdx) => {
                  const badge = BADGE_CONFIG[item.tipo] ?? BADGE_CONFIG.novo;
                  return (
                    <li key={itemIdx} className="flex items-start gap-2.5 text-xs text-[var(--text,#334155)] leading-relaxed">
                      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span>{item.texto}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--line,#e2e8f0)] bg-[var(--panel2,#f8fafc)] text-xs text-[var(--muted,#64748b)]">
          <span>Labor Rural &bull; Gestão Analítica</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--brand,#004d49)] text-white font-medium hover:brightness-110 active:scale-98 transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

