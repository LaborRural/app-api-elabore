import React from "react";

interface NavIconProps {
  name: string;
  className?: string;
  size?: number;
}

export function NavIcon({ name, className, size = 17 }: NavIconProps) {
  const cls = className ? `${className} ic-svg` : "ic-svg";
  const iconStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    maxWidth: size,
    maxHeight: size,
    flexShrink: 0,
    display: "block",
  };

  const normalized = name.toLowerCase().trim();

  switch (normalized) {
    case "inicio":
    case "dashboard":
    case "painel inicial":
    case "visão geral":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      );

    case "cadastros":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M11 12H3" />
          <path d="M16 6H3" />
          <path d="M16 18H3" />
          <path d="M18 9v6" />
          <path d="M21 12h-6" />
        </svg>
      );

    case "áreas":
    case "areas":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m12 8 6-3-6-3v10" />
          <path d="m8 11.99-5.5 3.14a1 1 0 0 0 0 1.74l8.5 4.86a2 2 0 0 0 2 0l8.5-4.86a1 1 0 0 0 0-1.74L16 12" />
          <path d="m6.49 12.85 11.02 6.3" />
          <path d="M17.51 12.85 6.5 19.15" />
        </svg>
      );

    case "lançamentos":
    case "lancamentos":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
          <path d="M12 10v6" />
          <path d="m9 13 3 3 3-3" />
        </svg>
      );

    case "controles":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="m9 14 2 2 4-4" />
        </svg>
      );

    case "propriedades":
    case "propriedade(s)":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );

    case "empresarios":
    case "empresários(as)":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="20" height="14" x="2" y="7" rx="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      );

    case "agroindustrias":
    case "agroindústrias":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
          <path d="M17 18h1" />
          <path d="M12 18h1" />
          <path d="M7 18h1" />
        </svg>
      );

    case "culturas-plantadas":
    case "culturas plantadas":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      );

    case "despesas-culturas":
    case "despesas culturas":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5.8-6.4 3-13" />
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
          <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
        </svg>
      );

    case "receitas":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      );

    case "despesas":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        </svg>
      );

    case "evolucao-rebanho":
    case "evolução do rebanho":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      );

    case "patrimonio":
    case "patrimônio":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
          <path d="M6 15h2" />
          <path d="M12 15h4" />
        </svg>
      );

    case "estoque":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="20" height="5" x="2" y="3" rx="1" />
          <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
          <path d="M10 12h4" />
        </svg>
      );

    case "parcelas":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
        </svg>
      );

    case "indicadores":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      );

    case "indicadores-mensais":
    case "indicadores mensais":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      );

    case "indicadores-anuais":
    case "indicadores anuais":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M3 3v18h18" />
          <rect width="3" height="7" x="7" y="11" />
          <rect width="3" height="11" x="12" y="7" />
          <rect width="3" height="5" x="17" y="13" />
        </svg>
      );

    case "custo-forrageira":
    case "custo de forrageira":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M7 20h10" />
          <path d="M10 20c5.5-2.5.8-6.4 3-10" />
          <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z" />
          <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z" />
        </svg>
      );

    case "rateios":
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a10 10 0 0 1 10 10h-10z" />
        </svg>
      );

    default:
      return (
        <svg
          className={cls}
          width={size}
          height={size}
          style={iconStyle}
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
  }
}
