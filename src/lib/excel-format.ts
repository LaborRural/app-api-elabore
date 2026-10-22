import "server-only";
import ExcelJS from "exceljs";
import { getNestedValue, type ColumnDef } from "./screens";
import { formatCellValue } from "./format";

/**
 * Port fiel em TypeScript de `aplicar_estilo_listrado_xlsx` e `aplicar_formatacao_excel`
 * da biblioteca `lr-functions/functions/excel_format.py`.
 *
 * Regras aplicadas:
 * - Fonte Aptos tamanho 11 (cabeçalho e dados)
 * - Cabeçalho: fundo verde #247B72, texto #FFFFFF em negrito, centralizado, altura 38, sem bordas
 * - Dados: altura 20, alinhamento vertical centralizado, listrado alternado (#F2F2F2 e #FFFFFF,
 *   com primeira_linha_cinza = true), sem bordas
 * - Sem linhas de grade (showGridLines = false) e zoom 85%
 * - Painel congelado na linha 1 (A2) e auto-filtro em todas as colunas
 * - Datas formatadas como dd/mm/yyyy e centralizadas
 * - Largura automática das colunas (mín. 10, máx. 60, amostra de até 100 linhas)
 */
const UUID_VALUE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_HEADER_RE = /^(id|id_.+|idfazenda|id\s+fazenda)$/i;

/** Identifica colunas de ID técnico / UUID para ocultá-las nas planilhas exportadas. */
export function isUuidColumn(col: ColumnDef, rows: Record<string, unknown>[]): boolean {
  if (UUID_HEADER_RE.test(col.key.trim()) || UUID_HEADER_RE.test(col.label.trim())) {
    return true;
  }
  const sampleLimit = Math.min(rows.length, 25);
  for (let i = 0; i < sampleLimit; i++) {
    const raw = getNestedValue(rows[i], col.key);
    if (raw !== null && raw !== undefined && raw !== "") {
      return UUID_VALUE_RE.test(String(raw).trim());
    }
  }
  return false;
}

export async function generateStyledXlsxBuffer(
  sheetName: string,
  columns: ColumnDef[],
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const exportCols = columns.filter(
    (c) => c.type !== "parcelas_link" && !isUuidColumn(c, rows),
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Labor Rural - Elabore";
  workbook.created = new Date();

  const safeSheetName =
    sheetName.replace(/[\\/*?:[\]]/g, " ").trim().slice(0, 31) || "planilha";

  const worksheet = workbook.addWorksheet(safeSheetName, {
    views: [
      {
        state: "frozen",
        ySplit: 1,
        showGridLines: false,
        zoomScale: 85,
      },
    ],
    properties: {
      defaultRowHeight: 20,
    },
  });

  const totalCols = exportCols.length;

  // Linha 1: Cabeçalho
  const headerValues = exportCols.map((c) => c.label);
  const headerRow = worksheet.addRow(headerValues);
  headerRow.height = 38;

  const headerFill: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF247B72" },
  };
  const headerFont: Partial<ExcelJS.Font> = {
    name: "Aptos",
    size: 11,
    bold: true,
    color: { argb: "FFFFFFFF" },
  };
  const dataFont: Partial<ExcelJS.Font> = {
    name: "Aptos",
    size: 11,
    bold: false,
    color: { argb: "FF000000" },
  };
  const grayFill: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF2F2F2" },
  };
  const whiteFill: ExcelJS.FillPattern = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFFFFF" },
  };

  for (let colIdx = 1; colIdx <= totalCols; colIdx++) {
    const cell = headerRow.getCell(colIdx);
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.border = {};
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
  }

  // Linhas de dados (Linha 2 em diante)
  rows.forEach((rowObj, idx) => {
    const rowValues = exportCols.map((col) => {
      const raw = getNestedValue(rowObj, col.key);
      if (raw === null || raw === undefined || raw === "") return "";

      if (col.type === "date" || col.type === "month") {
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw));
        if (m) {
          return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
        }
        const d = new Date(String(raw));
        if (!Number.isNaN(d.getTime())) return d;
        return String(raw);
      }

      if (col.type === "currency" || col.type === "number" || col.type === "percent") {
        const n = Number(raw);
        return Number.isNaN(n) ? String(raw) : n;
      }

      if (col.type === "integer") {
        const n = Number(raw);
        return Number.isNaN(n) ? String(raw) : Math.round(n);
      }

      if (col.type === "boolean") {
        return raw === true ? "Sim" : raw === false ? "Não" : "";
      }

      if (col.type === "status") {
        return raw === true ? "Ativo" : raw === false ? "Inativo" : String(raw);
      }

      if (col.type === "inconsistencia") return formatCellValue(raw, col.type, true);

      return String(raw);
    });

    const excelRow = worksheet.addRow(rowValues);
    excelRow.height = 20;

    // primeira_linha_cinza = True (linha 1 de dados = cinza #F2F2F2, linha 2 = branco #FFFFFF)
    const dataRowNumber = idx + 1;
    const isGray = dataRowNumber % 2 === 1;
    const fill = isGray ? grayFill : whiteFill;

    for (let colIdx = 1; colIdx <= totalCols; colIdx++) {
      const colDef = exportCols[colIdx - 1];
      const cell = excelRow.getCell(colIdx);
      cell.fill = fill;
      cell.font = dataFont;
      cell.border = {};

      if (cell.value instanceof Date) {
        cell.numFmt = colDef.type === "month" ? "mm/yyyy" : "dd/mm/yyyy";
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (typeof cell.value === "number") {
        if (colDef.type === "currency") {
          cell.numFmt = 'R$ #,##0.00;[Red]-R$ #,##0.00;"-"';
        } else if (colDef.type === "number" || colDef.type === "percent") {
          cell.numFmt = "#,##0.00";
        } else {
          cell.numFmt = "#,##0";
        }
        cell.alignment = {
          vertical: "middle",
          horizontal: colDef.align === "center" ? "center" : "right",
        };
      } else {
        cell.alignment = {
          vertical: "middle",
          horizontal: colDef.align ?? "left",
        };
      }
    }
  });

  // Auto-filtro na linha 1
  if (totalCols > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, rows.length + 1), column: totalCols },
    };
  }

  // Largura automática das colunas (amostra de até 100 linhas, mín 10, máx 60)
  const sampleLimit = Math.min(rows.length, 100);
  exportCols.forEach((col, cIdx) => {
    let maxLen = col.label.length;
    for (let rIdx = 0; rIdx < sampleLimit; rIdx++) {
      const formatted = formatCellValue(getNestedValue(rows[rIdx], col.key), col.type);
      if (formatted && formatted !== "-") {
        maxLen = Math.max(maxLen, formatted.length);
      }
    }
    const column = worksheet.getColumn(cIdx + 1);
    column.width = Math.max(10, Math.min(maxLen + 4, 60));
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Gera conteúdo CSV no padrão LRTable (separador `;`, UTF-8 com BOM `\uFEFF`).
 */
export function generateCsvContent(
  columns: ColumnDef[],
  rows: Record<string, unknown>[],
): string {
  const exportCols = columns.filter(
    (c) => c.type !== "parcelas_link" && !isUuidColumn(c, rows),
  );

  const escapeCsv = (val: string): string => {
    const clean = val === "-" ? "" : val;
    if (/[;"\r\n]/.test(clean)) {
      return `"${clean.replace(/"/g, '""')}"`;
    }
    return clean;
  };

  const headerLine = exportCols.map((c) => escapeCsv(c.label)).join(";");
  const dataLines = rows.map((row) =>
    exportCols
      .map((col) => {
        const raw = getNestedValue(row, col.key);
        const formatted = formatCellValue(raw, col.type, true);
        return escapeCsv(formatted);
      })
      .join(";"),
  );

  return `\uFEFF${[headerLine, ...dataLines].join("\r\n")}`;
}

const processedWorkbookCache = new Map<string, Buffer>();

/**
 * Recebe o buffer de uma planilha .xlsx existente (ex.: Planilha Completa do SharePoint)
 * e oculta todas as colunas cujo cabeçalho ou valores sejam IDs UUID.
 */
export async function hideUuidColumnsInXlsxBuffer(
  input: ArrayBuffer | Buffer,
  cacheKey?: string,
): Promise<Buffer> {
  if (cacheKey) {
    const cached = processedWorkbookCache.get(cacheKey);
    if (cached) return cached;
  }

  const workbook = new ExcelJS.Workbook();
  const nodeBuf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(nodeBuf as any);

  workbook.eachSheet((ws) => {
    const headerRow = ws.getRow(1);
    const maxRow = Math.min(ws.rowCount, 30);

    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerText = String(cell.value ?? "").trim();
      let isUuid = UUID_HEADER_RE.test(headerText);

      if (!isUuid) {
        for (let r = 2; r <= maxRow; r++) {
          const rawVal = ws.getRow(r).getCell(colNumber).value;
          if (rawVal !== null && rawVal !== undefined && rawVal !== "") {
            const str = typeof rawVal === "object" && "text" in rawVal ? String(rawVal.text) : String(rawVal);
            if (UUID_VALUE_RE.test(str.trim())) {
              isUuid = true;
            }
            break;
          }
        }
      }

      if (isUuid) {
        ws.getColumn(colNumber).hidden = true;
      }
    });
  });

  const out = Buffer.from(await workbook.xlsx.writeBuffer());
  if (cacheKey) {
    if (processedWorkbookCache.size >= 6) {
      const oldest = processedWorkbookCache.keys().next().value;
      if (oldest) processedWorkbookCache.delete(oldest);
    }
    processedWorkbookCache.set(cacheKey, out);
  }
  return out;
}

