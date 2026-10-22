import type { PropertySummaryItem } from "./api";

// Escopo das telas de Indicadores (schema elabore do Supabase): só a equipe interna da Labor Rural
// consulta a base inteira. Qualquer outro usuário, mesmo consultor com várias agroindústrias,
// enxerga apenas as fazendas que a API devolve em /properties para o token dele.

export type ElaboreScope =
  | { kind: "all" }
  | { kind: "codes"; codes: string[] }
  | { kind: "property"; idProperty: string }
  | { kind: "empty" };

export function resolveElaboreScope(
  properties: PropertySummaryItem[],
  options: { internal: boolean; prop?: string; agro?: string; hasIdPropertyColumn?: boolean },
): ElaboreScope {
  if (options.internal && !options.prop && !options.agro) return { kind: "all" };

  let scope = properties;
  if (options.prop) scope = scope.filter((p) => p.id_property === options.prop);
  if (options.agro) scope = scope.filter((p) => p.id_agroindustry === options.agro);

  const codes = [
    ...new Set(
      scope.filter((p) => p.labor_rural_code).map((p) => p.labor_rural_code!.trim().toUpperCase()),
    ),
  ];
  if (codes.length > 0) return { kind: "codes", codes };
  if (options.prop && scope.length > 0 && options.hasIdPropertyColumn) {
    return { kind: "property", idProperty: options.prop };
  }
  return { kind: "empty" };
}
