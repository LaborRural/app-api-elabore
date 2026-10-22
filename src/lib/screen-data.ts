import "server-only";
import {
  apiGetWithToken,
  fetchAllPagesWithToken,
  getAgroindustriesCatalog,
  getPropertiesCatalogChecked,
  resolvePropertyNames,
  type AgroindustryItem,
  type Page,
  type PropertySummaryItem,
  type QueryParams,
} from "./api";
import { getNestedValue, SCREENS, type ColumnDef, type ScreenDef } from "./screens";
import { resolveElaboreScreen } from "./elabore-data";

export type ScreenFilterParams = {
  ano?: string;
  mes?: string; // ex: "1,2,3" ou "" (todos)
  prop?: string;
  agro?: string;
  ativo?: string; // "true" | "false" | ""
  q?: string;
  consistencia?: string; // "CONSISTENTE" | "INCONSISTENTE" | "OUTLIER" | ""
  aba?: string;
  id?: string; // ID específico de lançamento para parcelas
  page?: string;
  size?: string;
  sort?: string;
  dir?: string;
  safra?: string; // painel de custo de forrageira: "25/26,24/25"
  cultura?: string;
  produto?: string;
  view?: string; // "tabela" abre a tabela nas telas de Indicadores que têm painel (o painel é o padrão)
};

export type ResolvedScreenData = {
  screen: ScreenDef;
  activeTabId?: string;
  columns: ColumnDef[];
  rows: Record<string, unknown>[];
  total: number;
  page: number;
  size: number;
  pages: number;
  properties: PropertySummaryItem[];
  agroindustries: AgroindustryItem[];
  notice?: string;
  effectivePropertyId?: string;
  dataProcessamento?: string | null;
};

/** Converte Ano + Mês (multi-seleção) em start/end ISO (YYYY-MM-DD) e lista de meses. */
export function resolvePeriodRange(ano?: string, mes?: string): {
  start: string;
  end: string;
  selectedMonths: number[];
  selectedYear: number | null;
} {
  const yearNum = ano && ano !== "todos" && /^\d{4}$/.test(ano) ? Number(ano) : null;
  const months = (mes ?? "")
    .split(",")
    .map((m) => Number(m.trim()))
    .filter((m) => Number.isInteger(m) && m >= 1 && m <= 12)
    .sort((a, b) => a - b);

  if (!yearNum) {
    return {
      start: "2018-01-01",
      end: "2027-12-31",
      selectedMonths: months,
      selectedYear: null,
    };
  }

  const minMonth = months.length > 0 ? months[0] : 1;
  const maxMonth = months.length > 0 ? months[months.length - 1] : 12;
  const lastDay = new Date(yearNum, maxMonth, 0).getDate();

  const start = `${yearNum}-${String(minMonth).padStart(2, "0")}-01`;
  const end = `${yearNum}-${String(maxMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { start, end, selectedMonths: months, selectedYear: yearNum };
}

function extractRecordDate(row: Record<string, unknown>): string | null {
  const candidates = [
    row.reference_month,
    row.entry_date,
    row.applied_at,
    row.purchase_date,
    row.movement_date,
    row.forecast_date,
    row.planted_at,
    row.acquired_at,
    row.started_at,
    row.created_at,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length >= 7) return c;
  }
  return null;
}

function matchesYearAndMonths(
  row: Record<string, unknown>,
  selectedYear: number | null,
  selectedMonths: number[],
): boolean {
  if (!selectedYear && selectedMonths.length === 0) return true;

  // Caso especial: evolução de rebanho tem year e month numéricos
  if (typeof row.year === "number" && typeof row.month === "number") {
    if (selectedYear && row.year !== selectedYear) return false;
    if (selectedMonths.length > 0 && !selectedMonths.includes(row.month)) return false;
    return true;
  }

  const dateStr = extractRecordDate(row);
  if (!dateStr) return true;
  const match = /^(\d{4})-(\d{2})/.exec(dateStr);
  if (!match) return true;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (selectedYear && y !== selectedYear) return false;
  if (selectedMonths.length > 0 && !selectedMonths.includes(m)) return false;
  return true;
}

function normalizeText(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Culturas plantadas: traz nome da área e área total (própria + arrendada) a partir de /areas. */
async function withAreaInfo(
  token: string,
  slug: string,
  rows: Record<string, unknown>[],
): Promise<Record<string, unknown>[]> {
  if (slug !== "culturas-plantadas" || rows.length === 0) return rows;
  try {
    const { items } = await fetchAllPagesWithToken<Record<string, unknown>>(token, "/areas", undefined, 20);
    const areas = new Map(items.map((a) => [String(a.id_area), a]));
    return rows.map((r) => {
      const a = areas.get(String(r.id_area));
      if (!a) return r;
      return {
        ...r,
        area_name: a.name,
        area_total: Number(a.hectares_owned ?? 0) + Number(a.hectares_rented ?? 0),
      };
    });
  } catch {
    return rows;
  }
}

export async function resolveScreenData(
  token: string,
  slug: string,
  rawParams: ScreenFilterParams,
  options?: { forExport?: boolean },
): Promise<ResolvedScreenData> {
  const screen = SCREENS[slug];
  if (!screen) {
    throw new Error(`Tela desconhecida: ${slug}`);
  }

  const forExport = options?.forExport ?? false;
  // Tamanhos de página oferecidos na tela ("por página"); padrão 15, como no Elabore.
  const sizeNum = [15, 20, 30, 40, 50].includes(Number(rawParams.size)) ? Number(rawParams.size) : 15;
  const pageNum = Math.max(1, Number(rawParams.page ?? 1) || 1);

  const activeTab = screen.tabs?.find((t) => t.id === rawParams.aba) ?? screen.tabs?.[0];
  const columns = activeTab ? activeTab.columns : screen.columns;
  const endpoint = activeTab ? activeTab.endpoint : screen.endpoint;
  const byPropertyEndpoint = activeTab ? activeTab.byPropertyEndpoint : screen.byPropertyEndpoint;
  const requiresPeriod = activeTab ? activeTab.requiresPeriod : screen.requiresPeriod;
  const requiresProperty = activeTab ? activeTab.requiresProperty : screen.requiresProperty;
  const supportsActive = activeTab ? activeTab.supportsActive : screen.supportsActive;

  // Catálogos auxiliares em paralelo
  const [{ items: properties, error: catalogError }, agroindustries] = await Promise.all([
    getPropertiesCatalogChecked(token),
    getAgroindustriesCatalog(token),
  ]);

  const propMap = new Map<string, PropertySummaryItem>();
  for (const p of properties) propMap.set(p.id_property, p);

  const agroMap = new Map<string, AgroindustryItem>();
  for (const a of agroindustries) agroMap.set(a.id_agroindustry, a);

  // Telas de INDICADORES: schema "elabore" do Supabase, filtrado e paginado no banco.
  if (screen.elabore) {
    const data = await resolveElaboreScreen(screen, screen.elabore, rawParams, properties, agroindustries, {
      forExport,
      page: pageNum,
      size: sizeNum,
    });
    // Catálogo fora do ar: usuário comum fica sem fazendas, então avisa em vez de só mostrar vazio.
    if (catalogError && data.rows.length === 0) {
      data.notice = "Não foi possível carregar as fazendas do seu usuário. Recarregue a página.";
    }
    return data;
  }

  if (screen.unavailableReason) {
    return {
      screen,
      activeTabId: activeTab?.id,
      columns,
      rows: [],
      total: 0,
      page: 1,
      size: sizeNum,
      pages: 1,
      properties,
      agroindustries,
      notice: screen.unavailableReason,
    };
  }

  const { start, end, selectedMonths, selectedYear } = resolvePeriodRange(
    rawParams.ano,
    rawParams.mes,
  );

  const isActiveParam =
    rawParams.ativo === "true" ? true : rawParams.ativo === "false" ? false : undefined;

  let rawRows: Record<string, unknown>[] = [];
  let effectivePropertyId = rawParams.prop || undefined;
  let dynamicNotice = activeTab?.notice ?? screen.notice;
  if (catalogError) {
    const aviso = "Não foi possível carregar o catálogo de propriedades; alguns nomes podem aparecer incompletos. Recarregue a página.";
    dynamicNotice = dynamicNotice ? `${dynamicNotice} ${aviso}` : aviso;
  }

  // 1) Caso especial: EMPRESÁRIOS (extraído de /property/{id_property})
  if (slug === "empresarios") {
    let targetProps = properties;
    if (rawParams.prop) {
      targetProps = targetProps.filter((p) => p.id_property === rawParams.prop);
    }
    if (rawParams.agro) {
      targetProps = targetProps.filter((p) => p.id_agroindustry === rawParams.agro);
    }
    const maxProps = forExport ? Math.min(targetProps.length, 60) : Math.min(targetProps.length, 25);
    const slice = targetProps.slice(0, maxProps);

    const details = await Promise.all(
      slice.map((p) =>
        apiGetWithToken<Record<string, unknown>>(token, `/property/${p.id_property}`).catch(
          () => null,
        ),
      ),
    );

    for (const d of details) {
      if (!d) continue;
      const ent = d.entrepreneur as Record<string, unknown> | null;
      if (ent) {
        rawRows.push({
          ...ent,
          id_property: d.id_property,
          property_name: d.property_name,
          id_agroindustry: d.id_agroindustry,
        });
      }
    }
  }
  // 2) Caso especial: EVOLUÇÃO DE REBANHO -> aba "rebanho" (/cattleperiods/{prop} + /cattle/{period})
  else if (slug === "evolucao-rebanho" && activeTab?.id === "rebanho") {
    if (!effectivePropertyId && properties.length > 0) {
      effectivePropertyId = properties[0].id_property;
      dynamicNotice = `Exibindo rebanho da propriedade "${properties[0].property_name}". Use o filtro Propriedade acima para alternar.`;
    }
    if (effectivePropertyId) {
      const propPeriods = await apiGetWithToken<{
        id_property: string;
        property_name: string;
        cattle_periods?: Page<{ id_period: string; year: number; month: number }>;
      }>(token, `/cattleperiods/${effectivePropertyId}`).catch(() => null);

      const periods = propPeriods?.cattle_periods?.items ?? [];
      const filteredPeriods = periods.filter((per) => {
        if (selectedYear && per.year !== selectedYear) return false;
        if (selectedMonths.length > 0 && !selectedMonths.includes(per.month)) return false;
        return true;
      });

      const targetPeriods = filteredPeriods.slice(0, forExport ? 36 : 12);
      const cattlePages = await Promise.all(
        targetPeriods.map(async (per) => {
          const res = await fetchAllPagesWithToken<Record<string, unknown>>(
            token,
            `/cattle/${per.id_period}`,
            {},
            3,
          ).catch(() => ({ items: [] }));
          return res.items.map((item) => ({
            ...item,
            id_property: effectivePropertyId,
            property_name:
              propPeriods?.property_name ??
              propMap.get(effectivePropertyId!)?.property_name ??
              "-",
            year: per.year,
            month: per.month,
            period_label: `${String(per.month).padStart(2, "0")}/${per.year}`,
          }));
        }),
      );
      rawRows = cattlePages.flat();
    }
  }
  // 3) Caso especial: PARCELAS (/expenseinstallments/{id}, /installments/{id}, etc.)
  else if (slug === "parcelas") {
    const tabId = activeTab?.id ?? "despesas";
    const specificId = rawParams.id?.trim();

    if (specificId) {
      const pathMap: Record<string, string> = {
        despesas: `/expenseinstallments/${specificId}`,
        receitas: `/installments/${specificId}`,
        adubacao: `/cultureexpensefertilizationinstallment/${specificId}`,
        manejo: `/cultureexpensemanagementinstallment/${specificId}`,
      };
      const res = await fetchAllPagesWithToken<Record<string, unknown>>(
        token,
        pathMap[tabId] ?? pathMap.despesas,
        supportsActive && isActiveParam !== undefined ? { is_active: isActiveParam } : {},
        5,
      ).catch(() => ({ items: [] }));

      rawRows = res.items.map((r) => ({
        ...r,
        parent_description: `Lançamento #${specificId.slice(0, 8)}`,
      }));
    } else {
      // Sem ID específico: busca os lançamentos do período e agrega as parcelas dos primeiros registros
      const parentConfig: Record<
        string,
        { listPath: string; idKey: string; instPath: string; descKey: string }
      > = {
        despesas: {
          listPath: rawParams.prop ? `/expenseentry/${rawParams.prop}` : "/expenseentry/changes",
          idKey: "id_expense_entry",
          instPath: "/expenseinstallments",
          descKey: "operation",
        },
        receitas: {
          listPath: rawParams.prop ? `/revenue/${rawParams.prop}` : "/revenue",
          idKey: "id_revenue_entry",
          instPath: "/installments",
          descKey: "description",
        },
        adubacao: {
          listPath: rawParams.prop
            ? `/cultureexpensefertilizationproduct/${rawParams.prop}`
            : "/cultureexpensefertilizationproduct/changes",
          idKey: "id_fertilization_product",
          instPath: "/cultureexpensefertilizationinstallment",
          descKey: "product_name",
        },
        manejo: {
          listPath: rawParams.prop
            ? `/cultureexpensemanagementproduct/${rawParams.prop}`
            : "/cultureexpensemanagementproduct/changes",
          idKey: "id_management_product",
          instPath: "/cultureexpensemanagementinstallment",
          descKey: "product_name",
        },
      };

      const cfg = parentConfig[tabId] ?? parentConfig.despesas;
      const parentQuery: QueryParams = { page: 1, size: forExport ? 40 : 15 };
      if (!rawParams.prop) {
        parentQuery.start = start;
        parentQuery.end = end;
      }
      if (isActiveParam !== undefined && tabId !== "receitas") {
        parentQuery.is_active = isActiveParam;
      }

      const parentsPage = await apiGetWithToken<Page<Record<string, unknown>>>(
        token,
        cfg.listPath,
        parentQuery,
      ).catch(() => ({ items: [] }));

      const parents = (parentsPage.items ?? []).slice(0, forExport ? 30 : 12);
      const instLists = await Promise.all(
        parents.map(async (parent) => {
          const entryId = String(parent[cfg.idKey] ?? "");
          if (!entryId) return [];
          const propId =
            (parent.id_property as string | undefined) ??
            ((parent.fertilization as Record<string, unknown> | undefined)?.id_property as
              | string
              | undefined) ??
            ((parent.management as Record<string, unknown> | undefined)?.id_property as
              | string
              | undefined);
          const propName =
            (parent.property_name as string | undefined) ??
            (propId ? propMap.get(propId)?.property_name : undefined) ??
            "-";
          const desc = String(parent[cfg.descKey] ?? parent.item_code ?? entryId.slice(0, 8));

          const instRes = await apiGetWithToken<Page<Record<string, unknown>>>(
            token,
            `${cfg.instPath}/${entryId}`,
            { page: 1, size: 100 },
          ).catch(() => ({ items: [] }));

          return (instRes.items ?? []).map((inst) => ({
            ...inst,
            id_property: propId,
            property_name: propName,
            parent_description: desc,
          }));
        }),
      );
      rawRows = instLists.flat();
    }
  }
  // 4) Fluxo padrão de endpoints paginados
  else if (endpoint) {
    let targetPath = endpoint;
    const query: QueryParams = {};

    if (requiresProperty) {
      if (!effectivePropertyId && properties.length > 0) {
        effectivePropertyId = properties[0].id_property;
        dynamicNotice = `Exibindo registros da propriedade "${properties[0].property_name}". Selecione outra Propriedade no filtro acima para alternar.`;
      }
      if (!effectivePropertyId) {
        return {
          screen,
          activeTabId: activeTab?.id,
          columns,
          rows: [],
          total: 0,
          page: 1,
          size: sizeNum,
          pages: 1,
          properties,
          agroindustries,
          notice: dynamicNotice,
        };
      }
      targetPath = endpoint.replace("{id_property}", effectivePropertyId);
    } else if (rawParams.prop && byPropertyEndpoint) {
      targetPath = byPropertyEndpoint.replace("{id_property}", rawParams.prop);
    } else if (requiresPeriod) {
      query.start = start;
      query.end = end;
    }

    if (supportsActive && isActiveParam !== undefined) {
      query.is_active = isActiveParam;
    }

    // Se há filtros aplicados no servidor do front (texto, propriedade sem endpoint próprio, agro, ordenação ou exportação),
    // buscamos todas as páginas necessárias; caso contrário, podemos buscar direto ou paginar.
    const needsServerFiltering =
      forExport ||
      Boolean(rawParams.q?.trim()) ||
      Boolean(rawParams.agro) ||
      Boolean(rawParams.prop && !byPropertyEndpoint && !requiresProperty) ||
      Boolean(!supportsActive && isActiveParam !== undefined) ||
      Boolean(rawParams.sort) ||
      selectedMonths.length > 0 ||
      Boolean(rawParams.prop && byPropertyEndpoint && (selectedYear || selectedMonths.length > 0));

    if (needsServerFiltering) {
      const { items } = await fetchAllPagesWithToken<Record<string, unknown>>(
        token,
        targetPath,
        query,
        forExport ? 50 : 10,
      );
      rawRows = items;
    } else {
      const res = await apiGetWithToken<Page<Record<string, unknown>>>(token, targetPath, {
        ...query,
        page: pageNum,
        size: sizeNum,
      });
      await fillMissingProperties(token, res.items ?? [], propMap);
      const enriched = await withAreaInfo(token, slug, enrichRows(res.items ?? [], propMap, agroMap));
      return {
        screen,
        activeTabId: activeTab?.id,
        columns,
        rows: enriched,
        total: res.total ?? enriched.length,
        page: res.page ?? pageNum,
        size: sizeNum,
        pages: Math.max(1, res.pages ?? Math.ceil((res.total ?? enriched.length) / sizeNum)),
        properties,
        agroindustries,
        notice: dynamicNotice,
        effectivePropertyId,
      };
    }
  }

  // Enriquecer com nome da propriedade e agroindústria
  await fillMissingProperties(token, rawRows, propMap);
  let rows = await withAreaInfo(token, slug, enrichRows(rawRows, propMap, agroMap));

  // Aplicar filtros no servidor do front
  if (rawParams.prop && !requiresProperty) {
    rows = rows.filter((r) => String(r.id_property ?? "") === rawParams.prop);
  }
  if (rawParams.agro) {
    rows = rows.filter((r) => String(r.id_agroindustry ?? "") === rawParams.agro);
  }
  if (isActiveParam !== undefined) {
    rows = rows.filter((r) =>
      typeof r.is_active === "boolean" ? r.is_active === isActiveParam : true,
    );
  }
  if (selectedYear || selectedMonths.length > 0) {
    rows = rows.filter((r) => matchesYearAndMonths(r, selectedYear, selectedMonths));
  }
  if (rawParams.q?.trim()) {
    const qNorm = normalizeText(rawParams.q.trim());
    rows = rows.filter((r) =>
      columns.some((col) => normalizeText(getNestedValue(r, col.key)).includes(qNorm)),
    );
  }

  // Ordenação
  if (rawParams.sort) {
    const sortKey = rawParams.sort;
    const dir = rawParams.dir === "desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const va = getNestedValue(a, sortKey);
      const vb = getNestedValue(b, sortKey);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return (
        String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" }) * dir
      );
    });
  }

  const total = rows.length;
  if (forExport) {
    return {
      screen,
      activeTabId: activeTab?.id,
      columns,
      rows,
      total,
      page: 1,
      size: total || 1,
      pages: 1,
      properties,
      agroindustries,
      notice: dynamicNotice,
      effectivePropertyId,
    };
  }

  const pages = Math.max(1, Math.ceil(total / sizeNum));
  const safePage = Math.min(pageNum, pages);
  const startIdx = (safePage - 1) * sizeNum;
  const pagedRows = rows.slice(startIdx, startIdx + sizeNum);

  return {
    screen,
    activeTabId: activeTab?.id,
    columns,
    rows: pagedRows,
    total,
    page: safePage,
    size: sizeNum,
    pages,
    properties,
    agroindustries,
    notice: dynamicNotice,
    effectivePropertyId,
  };
}

/** Para ids de propriedade fora do catálogo, busca o nome em /property/{id} e completa o mapa. */
async function fillMissingProperties(
  token: string,
  rows: Record<string, unknown>[],
  propMap: Map<string, PropertySummaryItem>,
): Promise<void> {
  const missing = new Set<string>();
  for (const row of rows) {
    if (row.property_name) continue;
    const fert = row.fertilization as Record<string, unknown> | undefined;
    const mgmt = row.management as Record<string, unknown> | undefined;
    const id = (row.id_property ?? fert?.id_property ?? mgmt?.id_property) as string | undefined;
    if (id && !propMap.has(id)) missing.add(id);
  }
  if (missing.size === 0) return;
  const names = await resolvePropertyNames(token, [...missing]);
  for (const [id, name] of names) {
    propMap.set(id, { id_property: id, property_name: name } as PropertySummaryItem);
  }
}

function enrichRows(
  rows: Record<string, unknown>[],
  propMap: Map<string, PropertySummaryItem>,
  agroMap: Map<string, AgroindustryItem>,
): Record<string, unknown>[] {
  return rows.map((row) => {
    const fert = row.fertilization as Record<string, unknown> | undefined;
    const mgmt = row.management as Record<string, unknown> | undefined;
    const propId =
      (row.id_property as string | undefined) ??
      (fert?.id_property as string | undefined) ??
      (mgmt?.id_property as string | undefined);

    const propInfo = propId ? propMap.get(propId) : undefined;
    const agroId = (row.id_agroindustry as string | undefined) ?? propInfo?.id_agroindustry ?? undefined;
    const agroInfo = agroId ? agroMap.get(agroId) : undefined;

    return {
      ...row,
      id_property: propId ?? row.id_property,
      id_agroindustry: agroId ?? row.id_agroindustry,
      property_name:
        (row.property_name as string | undefined) ?? propInfo?.property_name ?? (propId ? "Propriedade não identificada" : "-"),
      agroindustry_name:
        (row.agroindustry_name as string | undefined) ?? agroInfo?.name ?? "-",
    };
  });
}

