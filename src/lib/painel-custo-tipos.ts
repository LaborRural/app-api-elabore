// Tipos e constantes do painel de custos de forrageira, compartilhados entre servidor e navegador
// (painel-custo.ts é "server-only" e não pode ser importado por componentes de cliente).

export const SISTEMAS = ["PLANTIO DIRETO", "CULTIVO MINIMO", "CONVENCIONAL"] as const;
export type Sistema = (typeof SISTEMAS)[number];
export const SISTEMA_ROTULO: Record<Sistema, string> = {
  "PLANTIO DIRETO": "Plantio direto",
  "CULTIVO MINIMO": "Cultivo mínimo",
  CONVENCIONAL: "Convencional",
};

export const ETAPAS = [
  { key: "pre_plantio", label: "Pré-plantio", cols: ["etapa_pre_plantio"] },
  { key: "plantio", label: "Plantio", cols: ["etapa_plantio"] },
  { key: "tratos", label: "Tratos culturais", cols: ["etapa_tratos_culturais"] },
  {
    key: "colheita",
    label: "Colheita e ensilagem",
    cols: ["etapa_colheita_ensilagem_planta_inteira", "etapa_colheita_ensilagem_grao"],
  },
  { key: "nao_informada", label: "Etapa não informada", cols: ["etapa_etapa_nao_informada"] },
] as const;
export type EtapaKey = (typeof ETAPAS)[number]["key"];

export type PainelCustoParams = { safra?: string; cultura?: string; produto?: string; prop?: string; agro?: string };

export type SistemaItem = { sistema: Sistema; area: number; pct: number; fazendas: number };
export type PorSistema = {
  sistema: Sistema;
  fazendas: number;
  areaColhida: number;
  toneladas: number;
  tHa: number | null;
  rsHa: number | null;
  rsT: number | null;
  etapas: Record<EtapaKey, number | null>;
};
export type DetalheLinha = {
  codigo_lr: string;
  nome_fazenda: string;
  produtor: string;
  consultor: string;
  sistema: string;
  area_plantada_ha: number | null;
  pct_area: number | null;
  area_colhida_ha: number | null;
  toneladas: number | null;
  t_ha: number | null;
  rs_ha: number | null;
  rs_t: number | null;
  custo_total: number | null;
  rs_pre_plantio: number | null;
  rs_plantio: number | null;
  rs_tratos: number | null;
  rs_colheita: number | null;
  rs_nao_informada: number | null;
};
export type Opcao = { value: string; label: string };

export type PainelCustoData = {
  notice?: string;
  safras: Opcao[];
  culturas: Opcao[];
  produtos: Opcao[];
  selecao: { safra: string[]; cultura: string[]; produto: string[] };
  custoBase: "NOMINAL" | "DEFLACIONADO";
  avisos: string[];
  sistema: { areaTotal: number; areaNaoInformada: number; fazendas: number; itens: SistemaItem[]; conservacionistaPct: number | null };
  porSistema: PorSistema[];
  detalhe: DetalheLinha[];
  rodape: {
    fazendasComCusto: number;
    fazendasSemPrePlantio: number;
    producoesDescartadas: number;
    ultimaColheita: string | null;
  };
  dataProcessamento?: string | null;
};
