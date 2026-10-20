import { NextResponse } from "next/server";
import { ApiAuthError } from "@/lib/api";
import { generateCsvContent, generateStyledXlsxBuffer } from "@/lib/excel-format";
import { buildExportTimestamp } from "@/lib/format";
import { resolveScreenData, type ScreenFilterParams } from "@/lib/screen-data";
import { SCREENS } from "@/lib/screens";
import { clearSession, getToken } from "@/lib/session";

export async function GET(req: Request, ctx: { params: Promise<{ tela: string }> }) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { tela } = await ctx.params;
  if (!SCREENS[tela]) {
    return NextResponse.json({ error: `Tela '${tela}' não encontrada` }, { status: 404 });
  }

  const url = new URL(req.url);
  const sp = url.searchParams;
  const formato = (sp.get("formato") ?? "xlsx").toLowerCase();

  const filterParams: ScreenFilterParams = {
    ano: sp.get("ano") ?? undefined,
    mes: sp.get("mes") ?? undefined,
    prop: sp.get("prop") ?? undefined,
    agro: sp.get("agro") ?? undefined,
    ativo: sp.get("ativo") ?? undefined,
    q: sp.get("q") ?? undefined,
    consistencia: sp.get("consistencia") ?? undefined,
    aba: sp.get("aba") ?? undefined,
    id: sp.get("id") ?? undefined,
    sort: sp.get("sort") ?? undefined,
    dir: sp.get("dir") ?? undefined,
  };

  try {
    const data = await resolveScreenData(token, tela, filterParams, { forExport: true });
    const ts = buildExportTimestamp();
    const tabSuffix = data.activeTabId ? `_${data.activeTabId}` : "";
    const baseFileName = `${ts}_${data.screen.exportName}${tabSuffix}`;

    if (formato === "csv") {
      const csv = generateCsvContent(data.columns, data.rows);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${baseFileName}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const buffer = await generateStyledXlsxBuffer(
      data.screen.title,
      data.columns,
      data.rows,
    );

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseFileName}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof ApiAuthError) {
      await clearSession();
      return NextResponse.json({ error: "Sessão expirada" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Erro ao gerar exportação";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

