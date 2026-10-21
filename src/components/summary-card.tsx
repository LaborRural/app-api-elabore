import type { ButtonHTMLAttributes, ReactNode } from "react";

/* ==========================================================================
   Card de KPI no padrão Elabore (DashboardSummaryCard) + formatação de
   moeda e variação contra o período anterior. Estilos em toolbar-table.css
   (seção "Cards de KPI").
   ========================================================================== */

export type DeltaTone = "positive" | "negative" | "neutral";
export type Delta = { label: string; tone: DeltaTone };

type DeltaOptions = {
  /** Complemento do texto: "↑ 4,2% vs <target>". */
  target?: string;
  /** Usado em "Sem base em <noBaseTarget>" (padrão = target). */
  noBaseTarget?: string;
  /** Custo, CCS, CPP…: subir é ruim, então a cor se inverte. */
  higherIsBetter?: boolean;
};

const EPSILON = 0.000001;

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/** A partir de R$ 1.000 usa a forma compacta ("R$ 12,3 mil"); deixe o valor cheio no tooltip. */
export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(value);
  }
  return formatCurrency(value);
}

export function formatDecimal(value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: maxFractionDigits }).format(value);
}

function toneOf(delta: number, higherIsBetter: boolean): DeltaTone {
  const up = delta > 0;
  return up === higherIsBetter ? "positive" : "negative";
}

/**
 * "↑ 4,2% vs mês anterior". Sem um dos valores ou com base zero: "Sem base em …";
 * diferença menor que 0,01%: "Sem variação". Nunca devolve 0% nem ∞.
 */
export function formatDeltaPercent(current: number | null | undefined, previous: number | null | undefined, options: DeltaOptions = {}): Delta {
  const { target = "mês anterior", noBaseTarget = target, higherIsBetter = true } = options;
  if (current == null || previous == null) return { label: `Sem base em ${noBaseTarget}`, tone: "neutral" };
  if (Math.abs(previous) < EPSILON) {
    if (Math.abs(current) < EPSILON) return { label: "Sem variação", tone: "neutral" };
    return { label: `Sem base em ${noBaseTarget}`, tone: "neutral" };
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  if (Math.abs(delta) < 0.01) return { label: "Sem variação", tone: "neutral" };
  return {
    label: `${delta > 0 ? "↑" : "↓"} ${formatDecimal(Math.abs(delta), 1)}% vs ${target}`,
    tone: toneOf(delta, higherIsBetter),
  };
}

/** "↓ R$ 350,00 vs mês anterior" ou "↑ 1,5 L/dia vs mês anterior". */
export function formatDeltaAbsolute(current: number | null | undefined, previous: number | null | undefined, unit: string, options: DeltaOptions = {}): Delta {
  const { target = "mês anterior", noBaseTarget = target, higherIsBetter = true } = options;
  if (current == null || previous == null) return { label: `Sem base em ${noBaseTarget}`, tone: "neutral" };
  const delta = current - previous;
  if (Math.abs(delta) < EPSILON) return { label: "Sem variação", tone: "neutral" };
  const value = unit === "R$" ? formatCurrency(Math.abs(delta)) : `${formatDecimal(Math.abs(delta), 2)} ${unit}`.trim();
  return { label: `${delta > 0 ? "↑" : "↓"} ${value} vs ${target}`, tone: toneOf(delta, higherIsBetter) };
}

/**
 * Texto do "Sem base em …" quando falta dado: nomeia o mês que falta, ou os
 * dois ("abr/26 e mai/26").
 */
export function resolveNoBaseTarget(currentLabel: string, previousLabel: string, currentHasBase: boolean, previousHasBase: boolean): string {
  if (!currentHasBase && !previousHasBase) return `${previousLabel} e ${currentLabel}`;
  if (!currentHasBase) return currentLabel;
  return previousLabel;
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

/** Botão translúcido para ações dentro do card verde (ex.: "Lançar", "Ver"). */
export function CardActionButton({ className = "", type = "button", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`summary-card-action ${className}`} {...rest} />;
}

export type SummaryCardProps = {
  label: string;
  /** Valor já formatado; sem dado, passe "—" (nunca 0 inventado). */
  value: ReactNode;
  /** Ícone 18px (ex.: <TbCash /> do react-icons/tb ou um <svg>). */
  icon?: ReactNode;
  /** Explicação da fórmula, mostrada no ícone de info ao lado do rótulo. */
  labelTooltip?: string;
  /** Unidade abaixo do valor (variante vertical), ex.: "litros/dia". */
  unit?: string;
  /** Descrição curta abaixo do valor. */
  subtext?: string;
  /** Variação contra o período anterior (use formatDeltaPercent/Absolute). */
  delta?: Delta;
  /** Botões à direita (CardActionButton). */
  actions?: ReactNode;
  /** horizontal = ícone ao lado (58–64px); vertical = ícone em cima (90–98px). */
  variant?: "horizontal" | "vertical";
  /** Valor completo no tooltip quando o valor exibido é compacto. */
  valueTitle?: string;
  className?: string;
};

export default function SummaryCard({
  label,
  value,
  icon,
  labelTooltip,
  unit,
  subtext,
  delta,
  actions,
  variant = "horizontal",
  valueTitle,
  className = "",
}: SummaryCardProps) {
  return (
    <article className={`summary-card summary-card--${variant} ${className}`}>
      <div className="summary-card-icon" aria-hidden="true">
        {icon ?? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="4" width="6" height="6" rx="1" />
            <rect x="14" y="4" width="6" height="6" rx="1" />
            <rect x="4" y="14" width="6" height="6" rx="1" />
            <rect x="14" y="14" width="6" height="6" rx="1" />
          </svg>
        )}
      </div>

      <div className="summary-card-body">
        <div className="summary-card-label-row">
          <span className="summary-card-label" title={label}>
            {label}
          </span>
          {labelTooltip && (
            <span className="summary-card-info" tabIndex={0} role="img" aria-label={labelTooltip} data-tip={labelTooltip}>
              <InfoIcon />
            </span>
          )}
        </div>
        <span className="summary-card-value" title={valueTitle}>
          {value}
        </span>
        {unit && <span className="summary-card-unit">{unit}</span>}
        {subtext && <span className="summary-card-subtext">{subtext}</span>}
        {delta && <span className={`summary-card-delta summary-card-delta--${delta.tone}`}>{delta.label}</span>}
      </div>

      {actions && <div className="summary-card-actions">{actions}</div>}
    </article>
  );
}
