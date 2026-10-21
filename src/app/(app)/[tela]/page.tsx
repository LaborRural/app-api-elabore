import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { ApiAuthError, getAgroindustriesCatalog, getPropertiesCatalog } from "@/lib/api";
import { resolvePainelAnual, type PainelAnualData } from "@/lib/painel-anual";
import { resolvePainelCusto } from "@/lib/painel-custo";
import { resolvePainelMensal } from "@/lib/painel-mensal";
import { resolveScreenData, type ScreenFilterParams } from "@/lib/screen-data";
import { SCREENS } from "@/lib/screens";
import { getToken, isInternalSession } from "@/lib/session";
import ScreenTable from "@/components/screen-table";
import PainelAnual from "@/components/painel-anual";
import PainelCusto from "@/components/painel-custo";
import PainelMensal from "@/components/painel-mensal";

// Telas de Indicadores que têm a visão "Painel" além da tabela (alternadas pelo submenu lateral).
const TELAS_COM_PAINEL = new Set(["indicadores-mensais", "indicadores-anuais", "custo-forrageira"]);

type PageProps = {
  params: Promise<{ tela: string }>;
  searchParams: Promise<ScreenFilterParams>;
};

export default function DynamicScreenPage({ params, searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="panel-card flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--line)] border-t-[#0f6e56]" />
            <span className="text-xs font-bold text-[var(--green-900)]">
              Carregando dados da API Elabore…
            </span>
          </div>
        </div>
      }
    >
      <ScreenContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ScreenContent({ params, searchParams }: PageProps) {
  // Dados sempre por requisição: os caches em memória de api.ts/supabase.ts leem o relógio.
  await connection();
  const { tela } = await params;
  if (!SCREENS[tela]) {
    notFound();
  }

  const token = await getToken();
  if (!token) {
    redirect("/login?expired=1");
  }

  const sp = await searchParams;
  const internal = await isInternalSession();

  if (tela === "custo-forrageira" && sp.view !== "tabela") {
    let painel;
    try {
      const [properties, agroindustries] = await Promise.all([
        getPropertiesCatalog(token),
        getAgroindustriesCatalog(token),
      ]);
      painel = { properties, agroindustries, data: await resolvePainelCusto(sp, properties) };
    } catch (err) {
      if (err instanceof ApiAuthError) redirect("/login?expired=1");
      throw err;
    }
    return (
      <PainelCusto
        data={painel.data}
        properties={painel.properties}
        agroindustries={painel.agroindustries}
        fullSheetHref={internal ? `/api/planilha/forrageira` : undefined}
      />
    );
  }

  if (TELAS_COM_PAINEL.has(tela) && tela !== "custo-forrageira" && sp.view !== "tabela") {
    let painel;
    try {
      const [properties, agroindustries] = await Promise.all([
        getPropertiesCatalog(token),
        getAgroindustriesCatalog(token),
      ]);
      const data = tela === "indicadores-anuais" ? await resolvePainelAnual(sp, properties) : await resolvePainelMensal(sp, properties);
      painel = { properties, agroindustries, data };
    } catch (err) {
      if (err instanceof ApiAuthError) redirect("/login?expired=1");
      throw err;
    }
    const exportParams = new URLSearchParams({ formato: "xlsx" });
    if (painel.data.property) exportParams.set("prop", painel.data.property.id_property);
    if (sp.ano) exportParams.set("ano", sp.ano);
    if (sp.mes) exportParams.set("mes", sp.mes);
    const painelProps = {
      properties: painel.properties,
      agroindustries: painel.agroindustries,
      exportHref: painel.data.property ? `/api/export/${tela}?${exportParams.toString()}` : undefined,
    };
    if (tela === "indicadores-anuais") {
      return <PainelAnual data={painel.data as PainelAnualData} {...painelProps} fullSheetHref={internal ? `/api/planilha/annual` : undefined} />;
    }
    return <PainelMensal data={painel.data} {...painelProps} fullSheetHref={internal ? `/api/planilha/monthly` : undefined} />;
  }

  let data;
  try {
    data = await resolveScreenData(token, tela, sp);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      redirect("/login?expired=1");
    }
    throw err;
  }

  return (
    <ScreenTable
      screen={data.screen}
      activeTabId={data.activeTabId}
      columns={data.columns}
      rows={data.rows}
      total={data.total}
      page={data.page}
      size={data.size}
      pages={data.pages}
      properties={data.properties}
      agroindustries={data.agroindustries}
      notice={data.notice}
      effectivePropertyId={data.effectivePropertyId}
      fullSheetHref={data.screen.elabore && internal ? `/api/planilha/${data.screen.elabore.fullSheet}` : undefined}
    />
  );
}