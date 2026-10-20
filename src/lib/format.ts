import type { ColumnType } from "./screens";

/** Formata uma string ISO (YYYY-MM-DD...) para dd/mm/aaaa em pt-BR. */
export function formatDatePtBr(val: unknown): string {
  if (!val) return "—";
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

/** Formata valores de célula para exibição em tela e exportação CSV. */
export function formatCellValue(val: unknown, type: ColumnType = "text"): string {
  if (val === null || val === undefined || val === "") return "—";

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
      return val === true ? "Sim" : val === false ? "Não" : "—";
    case "status":
      return val === true ? "Ativo" : val === false ? "Inativo" : String(val);
    default:
      return String(val);
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

