import { NextResponse } from "next/server";
import { FULL_SHEETS, latestFullSheet, type FullSheetKind } from "@/lib/sharepoint";
import { getToken, isInternalSession } from "@/lib/session";

// Planilha completa (todas as fazendas) do lr-indicadores-elabore, só para a equipe Labor Rural.
// O arquivo passa pelo servidor: a URL temporária do SharePoint nunca chega ao navegador.
export async function GET(_req: Request, ctx: { params: Promise<{ tipo: string }> }) {
  if (!(await getToken())) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (!(await isInternalSession())) {
    return NextResponse.json({ error: "Planilha completa disponível só para a equipe Labor Rural" }, { status: 403 });
  }

  const { tipo } = await ctx.params;
  if (!(tipo in FULL_SHEETS)) {
    return NextResponse.json({ error: `Planilha '${tipo}' não encontrada` }, { status: 404 });
  }

  try {
    const file = await latestFullSheet(tipo as FullSheetKind);
    const res = await fetch(file.downloadUrl, { cache: "no-store" });
    if (!res.ok || !res.body) throw new Error(`SharePoint ${res.status} ao baixar ${file.name}`);
    return new NextResponse(res.body, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${file.name}"`,
        "Content-Length": String(file.size),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao baixar a planilha";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
