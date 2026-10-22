import { humanizarInconsistencias } from "./inconsistencias";
import type { ColumnType } from "./screens";

/** Formata uma string ISO (YYYY-MM-DD...) para dd/mm/aaaa em pt-BR. */
export function formatDatePtBr(val: unknown): string {
  if (!val) return "-";
  const str = String(val);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (m) {
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("pt-BR");
  }
  return str;
}

// Códigos técnicos do banco → texto amigável (chave sem caixa).
const FRIENDLY: Record<string, string> = {
  active_approved: "Ativo - Aprovado",
  active_pending: "Ativo - Pendente",
  active_rejected: "Ativo - Reprovado",
  active_in_review: "Ativo - Em análise",
  inactive: "Inativo",
  inactive_approved: "Inativo - Aprovado",
  pending: "Pendente",
  pending_approval: "Aguardando aprovação",
  approved: "Aprovado",
  rejected: "Reprovado",
  blocked: "Bloqueado",
  pasture: "Pasto",
  semi_confined: "Semiconfinado",
  confined: "Confinado",
  compost_barn: "Compost barn",
  free_stall: "Free stall",
  tie_stall: "Tie stall",
  paid: "Pago",
  received: "Recebido",
  open: "Em aberto",
  overdue: "Atrasado",
  late: "Atrasado",
  canceled: "Cancelado",
  cancelled: "Cancelado",
  scheduled: "Previsto",
  forecast: "Previsto",
  partial: "Parcial",
  partially_paid: "Pago parcialmente",
  positive: "Positivo",
  negative: "Negativo",
  zero: "Zerado",
  zeroed: "Zerado",
  in_stock: "Em estoque",
  out_of_stock: "Sem estoque",
  low_stock: "Estoque baixo",
  labor: "Mão de obra",
  health_other: "Sanidade e outros",
  feeding: "Alimentação",
  own_milk: "Leite próprio",
  energy_fuel: "Energia e combustível",
  estocar: "Estocar",
  consumir: "Consumir",
  estocar_consumir: "Estocar e consumir",
  expense: "Despesa",
  revenue: "Receita",
};

/** Só mexe em códigos técnicos (snake_case ou MAIÚSCULAS_COM_UNDERLINE); nomes comuns ficam como vieram. */
export function friendlyText(val: string, loose = false): string {
  const s = val.trim();
  const k = s.toLowerCase();
  if (FRIENDLY[k]) return FRIENDLY[k];
  // loose (colunas "codigo"): também ajusta palavra única em MAIÚSCULAS ou minúsculas
  const code = loose ? /^[A-Za-z0-9]+([_\s-][A-Za-z0-9]+)*$/ : /^[A-Za-z0-9]+(_[A-Za-z0-9]+)+$/;
  if (code.test(s) && (s === k || s === s.toUpperCase())) {
    const t = k.replace(/[_-]/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return val;
}

/** Formata valores de célula para exibição em tela e exportação CSV. */
export function formatCellValue(val: unknown, type: ColumnType = "text", completo = false): string {
  if (val === null || val === undefined || val === "") return "-";

  switch (type) {
    case "date":
      return formatDatePtBr(val);
    case "month": {
      const m = /^(\d{4})-(\d{2})/.exec(String(val));
      return m ? `${m[2]}/${m[1]}` : formatDatePtBr(val);
    }
    case "currency": {
      const n = Number(val);
      if (Number.isNaN(n)) return String(val);
      return n.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    case "number": {
      const n = Number(val);
      if (Number.isNaN(n)) return String(val);
      return n.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    case "integer": {
      const n = Number(val);
      if (Number.isNaN(n)) return String(val);
      return Math.round(n).toLocaleString("pt-BR");
    }
    case "percent": {
      const n = Number(val);
      if (Number.isNaN(n)) return String(val);
      return `${n.toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      })}%`;
    }
    case "boolean":
      return val === true ? "Sim" : val === false ? "Não" : "-";
    case "status":
      return val === true ? "Ativo" : val === false ? "Inativo" : String(val);
    case "inconsistencia":
      return humanizarInconsistencias(String(val), completo);
    case "codigo":
      return typeof val === "string" ? friendlyText(val, true) : String(val);
    default:
      return typeof val === "string" ? friendlyText(val) : String(val);
  }
}

/** Gera o timestamp AAAA_MM_DD_HHMMSS para nomes de arquivos de exportação. */
export function buildExportTimestamp(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `${yyyy}_${mm}_${dd}_${hh}${min}${ss}`;
}

