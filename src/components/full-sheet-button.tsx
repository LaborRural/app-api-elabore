"use client";

import { useRef, useState } from "react";

type Props = {
  href: string;
  label?: string;
  downloadingLabel?: string;
  icon?: string;
  fallbackFilename?: string;
  title?: string;
};

export default function FullSheetButton({
  href,
  label = "Planilha completa",
  downloadingLabel = "Baixando planilha…",
  icon = "cloud_download",
  fallbackFilename = "planilha_completa.xlsx",
  title = "Baixa a última planilha gerada pelo lr-indicadores-elabore, com todas as abas e todas as fazendas",
}: Props) {
  const [downloading, setDownloading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();

    // Se já estiver baixando, o clique cancela a exportação/download em andamento
    if (downloading) {
      abortRef.current?.abort();
      abortRef.current = null;
      setDownloading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setDownloading(true);

    try {
      const res = await fetch(href, {
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (res.status === 401) {
        window.location.href = "/login?expired=1";
        return;
      }
      if (!res.ok) {
        throw new Error(`Falha ao baixar planilha (${res.status})`);
      }

      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
      const filename = match?.[1] ? decodeURIComponent(match[1]) : fallbackFilename;

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
      // Fallback caso o fetch falhe por algum motivo de rede/navegador
      window.location.href = href;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setDownloading(false);
      }
    }
  }

  return (
    <a
      href={href}
      download
      onClick={handleClick}
      aria-busy={downloading}
      className={`btn-table-export${downloading ? " is-downloading" : ""}`}
      title={downloading ? "Clique para cancelar a exportação" : title}
    >
      {downloading ? (
        <svg
          className="ic-dl-anim"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <g className="ic-dl-arrow">
            <path d="M12 3v11" />
            <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
          </g>
          <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
      ) : (
        <span className="material-symbols-rounded" style={{ fontSize: 17 }}>
          {icon}
        </span>
      )}
      <span>{downloading ? downloadingLabel : label}</span>
      {downloading && (
        <span className="dl-cancel-badge" aria-label="Cancelar exportação">
          ✕ Cancelar
        </span>
      )}
    </a>
  );
}
