"use client";

import { useEffect, useRef, useState } from "react";

export type ExportFormat = "excel" | "csv" | "pdf-resumido" | "pdf-expandido";

type Props = {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  exportingFormat?: string | null;
};

export default function ExportMenu({ onExport, disabled, exportingFormat }: Props) {
  const [openMenu, setOpenMenu] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
        setOpenSubmenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="lr-export-wrap" ref={wrapRef}>
      <button
        type="button"
        className="btn-table-export"
        aria-haspopup="menu"
        aria-expanded={openMenu}
        disabled={disabled}
        onClick={() => {
          setOpenMenu((prev) => !prev);
          setOpenSubmenu(false);
        }}
      >
        <svg
          className="ic-exp-dl"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
        </svg>
        <span>{exportingFormat ? `Exportando ${exportingFormat}…` : "Exportar"}</span>
        <svg
          className="ic-exp-arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {openMenu && (
        <div className="lr-export-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            className="lr-export-item"
            onClick={() => {
              setOpenMenu(false);
              onExport("excel");
            }}
          >
            <svg
              className="ic-exp-dl"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />
            </svg>
            <span>Exportar Excel</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="lr-export-item"
            onClick={() => {
              setOpenMenu(false);
              onExport("csv");
            }}
          >
            <svg
              className="ic-exp-dl"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>Exportar CSV</span>
          </button>

          <div
            className="lr-export-sub-wrap"
            onMouseEnter={() => setOpenSubmenu(true)}
            onMouseLeave={() => setOpenSubmenu(false)}
          >
            <button
              type="button"
              role="menuitem"
              className="lr-export-item lr-export-has-sub"
              aria-haspopup="menu"
              aria-expanded={openSubmenu}
              onClick={() => setOpenSubmenu((prev) => !prev)}
            >
              <svg
                className="ic-exp-pdf"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Exportar PDF</span>
              <svg
                className="ic-exp-chevron"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>

            {openSubmenu && (
              <div className="lr-export-submenu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className="lr-export-item"
                  onClick={() => {
                    setOpenMenu(false);
                    setOpenSubmenu(false);
                    onExport("pdf-resumido");
                  }}
                >
                  <svg
                    className="ic-exp-pdf"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>PDF resumido</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  className="lr-export-item"
                  onClick={() => {
                    setOpenMenu(false);
                    setOpenSubmenu(false);
                    onExport("pdf-expandido");
                  }}
                >
                  <svg
                    className="ic-exp-pdf"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span>PDF expandido</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
