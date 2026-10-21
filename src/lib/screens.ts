export type FilterKey =
  | "ano"
  | "mes"
  | "prop"
  | "agro"
  | "ativo"
  | "q"
  | "lancamento"
  | "consistencia";

export type ColumnType =
  | "text"
  | "number"
  | "integer"
  | "currency"
  | "percent"
  | "date"
  | "month"
  | "boolean"
  | "status"
  | "consistencia"
  | "parcelas_link";

export type ColumnDef = {
  key: string;
  label: string;
  type?: ColumnType;
  align?: "left" | "center" | "right";
  parcelasTab?: string;
  parcelasIdKey?: string;
};

export type ScreenTabDef = {
  id: string;
  label: string;
  endpoint: string;
  byPropertyEndpoint?: string;
  requiresPeriod?: boolean;
  requiresProperty?: boolean;
  supportsActive?: boolean;
  columns: ColumnDef[];
  notice?: string;
};

export type MenuGroup = "Cadastros" | "Áreas" | "Lançamentos" | "Controles" | "Indicadores";

export type ElaboreSourceDef = {
  /** Tabela no schema elabore. */
  table: string;
  /** Coluna com o código LR/PRO, ligada ao labor_rural_code das propriedades da API. */
  codeColumn: string;
  /** Ordenação padrão PostgREST (ex.: "labor_rural_code.asc,reference_month.desc"). */
  order: string;
  /** Coluna usada pelos filtros Ano/Mês: mês (timestamp) ou janela anual "Abr/25-Mar/26". */
  period?: { column: string; kind: "month" | "annual_window" };
  /** Coluna usada pelo filtro "consistencia". */
  consistencyColumn?: string;
  /** Colunas de texto pesquisadas pela busca. */
  searchColumns: string[];
  /** Colunas repetidas em todas as abas de grupo (identificam a linha). */
  fixedColumns: string[];
  /** Planilha completa no SharePoint (botão só para a equipe Labor Rural). */
  fullSheet: "monthly" | "annual" | "forrageira";
};

export type ScreenDef = {
  slug: string;
  group: MenuGroup;
  title: string;
  subtitle: string;
  code: string;
  icon: string;
  exportName: string;
  filters: FilterKey[];
  endpoint?: string;
  byPropertyEndpoint?: string;
  requiresPeriod?: boolean;
  requiresProperty?: boolean;
  supportsActive?: boolean;
  unavailableReason?: string;
  notice?: string;
  /** Tela lida do schema "elabore" do Supabase (colunas vêm do dim_dicionario_colunas). */
  elabore?: ElaboreSourceDef;
  columns: ColumnDef[];
  tabs?: ScreenTabDef[];
};

export const MENU_GROUPS: {
  label: MenuGroup;
  icon: string;
}[] = [
  { label: "Cadastros", icon: "folder_managed" },
  { label: "Áreas", icon: "landscape" },
  { label: "Lançamentos", icon: "receipt_long" },
  { label: "Controles", icon: "inventory_2" },
  { label: "Indicadores", icon: "monitoring" },
];

export const SCREENS: Record<string, ScreenDef> = {
  propriedades: {
    slug: "propriedades",
    group: "Cadastros",
    title: "Propriedades",
    subtitle: "Cadastro geral de propriedades rurais vinculadas ao Elabore",
    code: "ELB-CAD-01",
    icon: "home_work",
    exportName: "propriedades",
    filters: ["agro", "ativo", "q"],
    endpoint: "/properties",
    columns: [
      { key: "property_name", label: "Propriedade", type: "text" },
      { key: "legal_name", label: "Razão Social", type: "text" },
      { key: "cnpj", label: "CNPJ / CPF", type: "text", align: "center" },
      { key: "city", label: "Cidade", type: "text" },
      { key: "uf", label: "UF", type: "text", align: "center" },
      { key: "agroindustry_name", label: "Agroindústria", type: "text" },
      { key: "labor_rural_code", label: "Cód. Labor Rural", type: "text", align: "center" },
      { key: "agroindustry_code", label: "Cód. Agroindústria", type: "text", align: "center" },
      { key: "is_approved", label: "Aprovada", type: "boolean", align: "center" },
      { key: "is_active", label: "Situação", type: "status", align: "center" },
    ],
  },

  empresarios: {
    slug: "empresarios",
    group: "Cadastros",
    title: "Empresários",
    subtitle: "Empresários rurais vinculados às propriedades cadastradas",
    code: "ELB-CAD-02",
    icon: "badge",
    exportName: "empresarios",
    filters: ["prop", "agro", "ativo", "q"],
    notice:
      "A API não possui endpoint isolado de Empresários (/entrepreneurs); os registros abaixo são extraídos a partir do vínculo de cada Propriedade (/property/{id_property}).",
    columns: [
      { key: "name", label: "Empresário(a)", type: "text" },
      { key: "cpf", label: "CPF", type: "text", align: "center" },
      { key: "property_name", label: "Propriedade Vinculada", type: "text" },
      { key: "email", label: "E-mail", type: "text" },
      { key: "mobile", label: "Celular", type: "text", align: "center" },
      { key: "city", label: "Cidade", type: "text" },
      { key: "uf", label: "UF", type: "text", align: "center" },
      { key: "birth_at", label: "Nascimento", type: "date", align: "center" },
      { key: "entry_at", label: "Entrada", type: "date", align: "center" },
      { key: "is_approved", label: "Aprovado", type: "boolean", align: "center" },
      { key: "is_active", label: "Situação", type: "status", align: "center" },
    ],
  },

  agroindustrias: {
    slug: "agroindustrias",
    group: "Cadastros",
    title: "Agroindústrias",
    subtitle: "Cadastro de agroindústrias e laticínios parceiros",
    code: "ELB-CAD-03",
    icon: "factory",
    exportName: "agroindustrias",
    filters: ["ativo", "q"],
    endpoint: "/agroindustry",
    supportsActive: true,
    columns: [
      { key: "name", label: "Nome Fantasia", type: "text" },
      { key: "razao_social", label: "Razão Social", type: "text" },
      { key: "cnpj", label: "CNPJ", type: "text", align: "center" },
      { key: "industry", label: "Segmento", type: "text" },
      { key: "city", label: "Cidade", type: "text" },
      { key: "uf", label: "UF", type: "text", align: "center" },
      { key: "cep", label: "CEP", type: "text", align: "center" },
      { key: "created_at", label: "Cadastro em", type: "date", align: "center" },
      { key: "is_active", label: "Situação", type: "status", align: "center" },
    ],
  },

  areas: {
    slug: "areas",
    group: "Áreas",
    title: "Cadastro de Áreas",
    subtitle: "Áreas próprias e arrendadas, irrigação e valor de terra nua por propriedade",
    code: "ELB-ARE-01",
    icon: "map",
    exportName: "areas",
    filters: ["prop", "agro", "ativo", "q"],
    endpoint: "/areas",
    byPropertyEndpoint: "/areas/{id_property}",
    supportsActive: true,
    columns: [
      { key: "name", label: "Área", type: "text" },
      { key: "property_name", label: "Propriedade", type: "text" },
      { key: "hectares_owned", label: "Ha Próprios", type: "number", align: "right" },
      { key: "hectares_rented", label: "Ha Arrendados", type: "number", align: "right" },
      { key: "raw_land_value", label: "Valor Terra Nua (R$)", type: "currency", align: "right" },
      { key: "is_irrigated", label: "Irrigada", type: "boolean", align: "center" },
      { key: "irrigation_type", label: "Tipo Irrigação", type: "text" },
      { key: "water_origin", label: "Origem Água", type: "text" },
      { key: "has_outorga", label: "Outorga", type: "boolean", align: "center" },
      { key: "started_at", label: "Início", type: "date", align: "center" },
      { key: "is_active", label: "Situação", type: "status", align: "center" },
    ],
  },

  "culturas-plantadas": {
    slug: "culturas-plantadas",
    group: "Áreas",
    title: "Culturas Plantadas",
    subtitle: "Lavouras e culturas implantadas nas áreas das propriedades",
    code: "ELB-ARE-02",
    icon: "grass",
    exportName: "culturas_plantadas",
    filters: ["prop", "agro", "ativo", "q"],
    endpoint: "/plantedculture",
    byPropertyEndpoint: "/plantedculture/{id_property}",
    supportsActive: true,
    columns: [
      { key: "name", label: "Identificação / Talhão", type: "text" },
      { key: "culture.name", label: "Cultura", type: "text" },
      { key: "culture.culture_type", label: "Tipo de Cultura", type: "text" },
      { key: "property_name", label: "Propriedade", type: "text" },
      { key: "planted_area", label: "Área Plantada (ha)", type: "number", align: "right" },
      { key: "planted_at", label: "Data Plantio", type: "date", align: "center" },
      { key: "observation", label: "Observação", type: "text" },
      { key: "is_active", label: "Situação", type: "status", align: "center" },
    ],
  },

  "despesas-culturas": {
    slug: "despesas-culturas",
    group: "Áreas",
    title: "Despesas com Culturas",
    subtitle: "Insumos de adubação/fertilização e produtos de manejo/defensivos aplicados nas culturas",
    code: "ELB-ARE-03",
    icon: "compost",
    exportName: "despesas_culturas",
    filters: ["ano", "mes", "prop", "ativo", "q"],
    columns: [],
    tabs: [
      {
        id: "adubacao",
        label: "Adubação / Fertilização",
        endpoint: "/cultureexpensefertilizationproduct/changes",
        byPropertyEndpoint: "/cultureexpensefertilizationproduct/{id_property}",
        requiresPeriod: true,
        supportsActive: true,
        columns: [
          { key: "applied_at", label: "Data Aplicação", type: "date", align: "center" },
          { key: "property_name", label: "Propriedade", type: "text" },
          { key: "product_name", label: "Produto", type: "text" },
          { key: "product_type", label: "Tipo", type: "text" },
          { key: "fertilization_purpose", label: "Finalidade", type: "text" },
          { key: "fertilization.harvest_season", label: "Safra", type: "text", align: "center" },
          { key: "stage", label: "Etapa", type: "text" },
          { key: "quantity", label: "Qtd.", type: "number", align: "right" },
          { key: "unit", label: "Unid.", type: "text", align: "center" },
          { key: "unit_cost", label: "Custo Unit. (R$)", type: "currency", align: "right" },
          { key: "line_total", label: "Valor Total (R$)", type: "currency", align: "right" },
          { key: "executed", label: "Executado", type: "boolean", align: "center" },
          { key: "is_active", label: "Situação", type: "status", align: "center" },
          {
            key: "id_fertilization_product",
            label: "Parcelas",
            type: "parcelas_link",
            align: "center",
            parcelasTab: "adubacao",
            parcelasIdKey: "id_fertilization_product",
          },
        ],
      },
      {
        id: "manejo",
        label: "Manejo / Defensivos",
        endpoint: "/cultureexpensemanagementproduct/changes",
        byPropertyEndpoint: "/cultureexpensemanagementproduct/{id_property}",
        requiresPeriod: true,
        supportsActive: true,
        columns: [
          { key: "applied_at", label: "Data Aplicação", type: "date", align: "center" },
          { key: "property_name", label: "Propriedade", type: "text" },
          { key: "product_name", label: "Produto", type: "text" },
          { key: "category", label: "Categoria", type: "text" },
          { key: "target", label: "Alvo Biológico", type: "text" },
          { key: "purpose", label: "Finalidade", type: "text" },
          { key: "method", label: "Método", type: "text" },
          { key: "quantity", label: "Qtd.", type: "number", align: "right" },
          { key: "unit", label: "Unid.", type: "text", align: "center" },
          { key: "unit_cost", label: "Custo Unit. (R$)", type: "currency", align: "right" },
          { key: "line_total", label: "Valor Total (R$)", type: "currency", align: "right" },
          { key: "executed", label: "Executado", type: "boolean", align: "center" },
          { key: "is_active", label: "Situação", type: "status", align: "center" },
          {
            key: "id_management_product",
            label: "Parcelas",
            type: "parcelas_link",
            align: "center",
            parcelasTab: "manejo",
            parcelasIdKey: "id_management_product",
          },
        ],
      },
    ],
  },

  receitas: {
    slug: "receitas",
    group: "Lançamentos",
    title: "Receitas",
    subtitle: "Lançamentos de receitas operacionais e não operacionais por competência",
    code: "ELB-LAN-01",
    icon: "trending_up",
    exportName: "receitas",
    filters: ["ano", "mes", "prop", "agro", "ativo", "q"],
    endpoint: "/revenue",
    byPropertyEndpoint: "/revenue/{id_property}",
    requiresPeriod: true,
    columns: [
      { key: "reference_month", label: "Competência", type: "date", align: "center" },
      { key: "property_name", label: "Propriedade", type: "text" },
      { key: "type", label: "Tipo", type: "text" },
      { key: "description", label: "Descrição", type: "text" },
      { key: "amount_total", label: "Valor Total (R$)", type: "currency", align: "right" },
      { key: "installment_count", label: "Nº Parcelas", type: "integer", align: "center" },
      { key: "installment_frequency", label: "Periodicidade", type: "text", align: "center" },
      { key: "observation", label: "Observação", type: "text" },
      { key: "is_active", label: "Situação", type: "status", align: "center" },
      {
        key: "id_revenue_entry",
        label: "Parcelas",
        type: "parcelas_link",
        align: "center",
        parcelasTab: "receitas",
        parcelasIdKey: "id_revenue_entry",
      },
    ],
  },

  despesas: {
    slug: "despesas",
    group: "Lançamentos",
    title: "Despesas",
    subtitle: "Lançamentos de despesas operacionais, insumos e investimentos",
    code: "ELB-LAN-02",
    icon: "trending_down",
    exportName: "despesas",
    filters: ["ano", "mes", "prop", "agro", "ativo", "q"],
    endpoint: "/expenseentry/changes",
    byPropertyEndpoint: "/expenseentry/{id_property}",
    requiresPeriod: true,
    supportsActive: true,
    columns: [
      { key: "entry_date", label: "Data Lançamento", type: "date", align: "center" },
      { key: "reference_month", label: "Competência", type: "date", align: "center" },
      { key: "property_name", label: "Propriedade", type: "text" },
      { key: "agroindustry_name", label: "Agroindústria", type: "text" },
      { key: "tab", label: "Grupo / Aba", type: "text" },
      { key: "operation", label: "Operação", type: "text" },
      { key: "line_code", label: "Cód. Linha", type: "text" },
      { key: "item_code", label: "Cód. Item", type: "text" },
      { key: "quantity", label: "Qtd.", type: "number", align: "right" },
      { key: "unit", label: "Unid.", type: "text", align: "center" },
      { key: "unit_price", label: "Preço Unit. (R$)", type: "currency", align: "right" },
      { key: "amount_total", label: "Valor Total (R$)", type: "currency", align: "right" },
      { key: "installment_count", label: "Parcelas", type: "integer", align: "center" },
      { key: "is_active", label: "Situação", type: "status", align: "center" },
      {
        key: "id_expense_entry",
        label: "Ver Parcelas",
        type: "parcelas_link",
        align: "center",
        parcelasTab: "despesas",
        parcelasIdKey: "id_expense_entry",
      },
    ],
  },

  "evolucao-rebanho": {
    slug: "evolucao-rebanho",
    group: "Lançamentos",
    title: "Evolução de Rebanho",
    subtitle: "Inventário de animais por período e sistemas de produção leiteira",
    code: "ELB-LAN-03",
    icon: "pets",
    exportName: "evolucao_rebanho",
    filters: ["ano", "mes", "prop", "q"],
    columns: [],
    tabs: [
      {
        id: "rebanho",
        label: "Rebanho por Período",
        endpoint: "/cattleperiods/{id_property}",
        requiresProperty: true,
        notice:
          "Selecione uma Propriedade no filtro acima para consultar os períodos de evolução de rebanho (/cattleperiods/{id_property} + /cattle/{id_period}).",
        columns: [
          { key: "period_label", label: "Mês/Ano", type: "text", align: "center" },
          { key: "property_name", label: "Propriedade", type: "text" },
          { key: "id_cattle_category", label: "Categoria Animal", type: "text" },
          { key: "total_animals", label: "Total Animais", type: "integer", align: "right" },
          { key: "value", label: "Valor Unit./Total (R$)", type: "currency", align: "right" },
          { key: "acquired", label: "Adquiridos", type: "integer", align: "right" },
          { key: "sold", label: "Vendidos", type: "integer", align: "right" },
          { key: "death", label: "Mortes", type: "integer", align: "right" },
          { key: "useful_life", label: "Vida Útil", type: "integer", align: "center" },
          { key: "updated_at", label: "Atualizado em", type: "date", align: "center" },
        ],
      },
      {
        id: "leite",
        label: "Produção Leiteira",
        endpoint: "/dairyproduction/changes",
        byPropertyEndpoint: "/dairyproduction/{id_property}",
        requiresPeriod: true,
        columns: [
          { key: "property_name", label: "Propriedade", type: "text" },
          { key: "category", label: "Categoria", type: "text" },
          { key: "pasture", label: "Pasto (%)", type: "integer", align: "right" },
          { key: "semi_confined", label: "Semi-confinado (%)", type: "integer", align: "right" },
          { key: "compost_barn", label: "Compost Barn (%)", type: "integer", align: "right" },
          { key: "free_stall", label: "Free Stall (%)", type: "integer", align: "right" },
          { key: "unstructured_confinment", label: "Conf. s/ Estrut. (%)", type: "integer", align: "right" },
          { key: "forage_type", label: "Tipo Volumoso", type: "text" },
          { key: "forage_quality", label: "Qualidade Volumoso", type: "text" },
          { key: "started_at", label: "Início", type: "date", align: "center" },
          { key: "finished_at", label: "Fim", type: "date", align: "center" },
        ],
      },
    ],
  },

  patrimonio: {
    slug: "patrimonio",
    group: "Lançamentos",
    title: "Patrimônio",
    subtitle: "Bens patrimoniais, máquinas, benfeitorias e depreciação por propriedade",
    code: "ELB-LAN-04",
    icon: "account_balance",
    exportName: "patrimonio",
    filters: ["prop", "ativo", "q"],
    endpoint: "/assets/{id_property}",
    requiresProperty: true,
    supportsActive: true,
    notice:
      "O endpoint de Patrimônio (/assets/{id_property}) é consultado por propriedade. Selecione a Propriedade desejada no filtro acima.",
    columns: [
      { key: "name", label: "Bem Patrimonial", type: "text" },
      { key: "property_name", label: "Propriedade", type: "text" },
      { key: "classification.name", label: "Classificação", type: "text" },
      { key: "classification_type.name", label: "Tipo", type: "text" },
      { key: "quantity", label: "Qtd.", type: "integer", align: "right" },
      { key: "acquired_at", label: "Aquisição", type: "date", align: "center" },
      { key: "value", label: "Valor Aquisição (R$)", type: "currency", align: "right" },
      { key: "corrected", label: "Valor Corrigido (R$)", type: "currency", align: "right" },
      { key: "service_life", label: "Vida Útil (anos)", type: "integer", align: "center" },
      { key: "activity_usage_percent", label: "% Uso Atividade", type: "percent", align: "right" },
      { key: "installment", label: "Parcelas", type: "integer", align: "center" },
      { key: "is_active", label: "Situação", type: "status", align: "center" },
    ],
  },

  estoque: {
    slug: "estoque",
    group: "Controles",
    title: "Controle de Estoque",
    subtitle: "Saldos de itens em estoque e histórico de movimentações de entrada e saída",
    code: "ELB-CON-01",
    icon: "warehouse",
    exportName: "estoque",
    filters: ["ano", "mes", "prop", "ativo", "q"],
    columns: [],
    tabs: [
      {
        id: "itens",
        label: "Itens de Estoque",
        endpoint: "/stockcontrolitem/changes",
        byPropertyEndpoint: "/stockcontrolitem/{id_property}",
        requiresPeriod: true,
        supportsActive: true,
        columns: [
          { key: "purchase_date", label: "Data Compra", type: "date", align: "center" },
          { key: "property_name", label: "Propriedade", type: "text" },
          { key: "item_name", label: "Nome do Item", type: "text" },
          { key: "item", label: "Cód. Item", type: "text" },
          { key: "category", label: "Categoria", type: "text" },
          { key: "purchased_quantity", label: "Qtd. Comprada", type: "number", align: "right" },
          { key: "in_stock_quantity", label: "Saldo Estoque", type: "number", align: "right" },
          { key: "unit", label: "Unid.", type: "text", align: "center" },
          { key: "unit_value", label: "Valor Unit. (R$)", type: "currency", align: "right" },
          { key: "origin", label: "Origem", type: "text" },
          { key: "situation", label: "Situação Estoque", type: "text", align: "center" },
          { key: "is_active", label: "Ativo", type: "status", align: "center" },
        ],
      },
      {
        id: "movimentacoes",
        label: "Movimentações de Estoque",
        endpoint: "/stockcontrolmovement/changes",
        byPropertyEndpoint: "/stockcontrolmovement/{id_property}",
        requiresPeriod: true,
        supportsActive: true,
        columns: [
          { key: "movement_date", label: "Data Mov.", type: "date", align: "center" },
          { key: "property_name", label: "Propriedade", type: "text" },
          { key: "movement_type", label: "Tipo Mov.", type: "text", align: "center" },
          { key: "category", label: "Categoria", type: "text" },
          { key: "source_module", label: "Módulo Origem", type: "text" },
          { key: "source_operation", label: "Operação", type: "text" },
          { key: "location", label: "Local", type: "text" },
          { key: "quantity", label: "Quantidade", type: "number", align: "right" },
          { key: "unit_value", label: "Valor Unit. (R$)", type: "currency", align: "right" },
          { key: "observation", label: "Observação", type: "text" },
          { key: "is_active", label: "Ativo", type: "status", align: "center" },
        ],
      },
    ],
  },

  parcelas: {
    slug: "parcelas",
    group: "Controles",
    title: "Controle de Parcelas",
    subtitle: "Parcelas financeiras vinculadas a lançamentos de Despesas, Receitas e Culturas",
    code: "ELB-CON-02",
    icon: "payments",
    exportName: "parcelas",
    filters: ["ano", "mes", "prop", "ativo", "lancamento", "q"],
    notice:
      "Na API, as parcelas são consultadas por lançamento (/expenseinstallments/{id}, /installments/{id}). Você pode clicar em 'Parcelas' diretamente nas telas de Receitas/Despesas ou consultar abaixo as parcelas dos lançamentos do período.",
    columns: [],
    tabs: [
      {
        id: "despesas",
        label: "Parcelas de Despesas",
        endpoint: "/expenseinstallments/{id_expense_entry}",
        requiresPeriod: true,
        supportsActive: true,
        columns: [
          { key: "installment_no", label: "Nº Parcela", type: "integer", align: "center" },
          { key: "property_name", label: "Propriedade", type: "text" },
          { key: "parent_description", label: "Despesa / Operação", type: "text" },
          { key: "forecast_date", label: "Previsão Pagto.", type: "date", align: "center" },
          { key: "payment_date", label: "Data Pagamento", type: "date", align: "center" },
          { key: "amount", label: "Valor Parcela (R$)", type: "currency", align: "right" },
          { key: "status", label: "Status Financeiro", type: "text", align: "center" },
          { key: "is_active", label: "Situação", type: "status", align: "center" },
        ],
      },
      {
        id: "receitas",
        label: "Parcelas de Receitas",
        endpoint: "/installments/{id_revenue_entry}",
        requiresPeriod: true,
        columns: [
          { key: "installment_no", label: "Nº Parcela", type: "integer", align: "center" },
          { key: "property_name", label: "Propriedade", type: "text" },
          { key: "parent_description", label: "Receita / Descrição", type: "text" },
          { key: "forecast_date", label: "Previsão Receb.", type: "date", align: "center" },
          { key: "receive_date", label: "Data Recebimento", type: "date", align: "center" },
          { key: "amount", label: "Valor Parcela (R$)", type: "currency", align: "right" },
          { key: "status", label: "Status Financeiro", type: "text", align: "center" },
          { key: "is_active", label: "Situação", type: "status", align: "center" },
        ],
      },
      {
        id: "adubacao",
        label: "Parcelas de Adubação",
        endpoint: "/cultureexpensefertilizationinstallment/{id_fertilization_product}",
        requiresPeriod: true,
        supportsActive: true,
        columns: [
          { key: "installment_no", label: "Nº Parcela", type: "integer", align: "center" },
          { key: "property_name", label: "Propriedade", type: "text" },
          { key: "parent_description", label: "Produto Adubação", type: "text" },
          { key: "forecast_date", label: "Previsão Pagto.", type: "date", align: "center" },
          { key: "payment_date", label: "Data Pagamento", type: "date", align: "center" },
          { key: "amount", label: "Valor Parcela (R$)", type: "currency", align: "right" },
          { key: "status", label: "Status Financeiro", type: "text", align: "center" },
          { key: "is_active", label: "Situação", type: "status", align: "center" },
        ],
      },
      {
        id: "manejo",
        label: "Parcelas de Manejo",
        endpoint: "/cultureexpensemanagementinstallment/{id_management_product}",
        requiresPeriod: true,
        supportsActive: true,
        columns: [
          { key: "installment_no", label: "Nº Parcela", type: "integer", align: "center" },
          { key: "property_name", label: "Propriedade", type: "text" },
          { key: "parent_description", label: "Produto Manejo", type: "text" },
          { key: "forecast_date", label: "Previsão Pagto.", type: "date", align: "center" },
          { key: "payment_date", label: "Data Pagamento", type: "date", align: "center" },
          { key: "amount", label: "Valor Parcela (R$)", type: "currency", align: "right" },
          { key: "status", label: "Status Financeiro", type: "text", align: "center" },
          { key: "is_active", label: "Situação", type: "status", align: "center" },
        ],
      },
    ],
  },

  rateios: {
    slug: "rateios",
    group: "Controles",
    title: "Controle de Rateios",
    subtitle: "Rateio de despesas e receitas entre atividades produtivas e centros de custo",
    code: "ELB-CON-03",
    icon: "pie_chart",
    exportName: "rateios",
    filters: [],
    unavailableReason:
      "A API do Elabore (https://torta.tec.br/laborrural/openapi.json) ainda não disponibiliza um endpoint para Controle de Rateios. Assim que o endpoint for publicado na API, basta adicioná-lo em src/lib/screens.ts.",
    columns: [
      { key: "property_name", label: "Propriedade", type: "text" },
      { key: "activity", label: "Atividade / Centro de Custo", type: "text" },
      { key: "percent", label: "% Rateio", type: "percent", align: "right" },
      { key: "is_active", label: "Situação", type: "status", align: "center" },
    ],
  },

  "indicadores-mensais": {
    slug: "indicadores-mensais",
    group: "Indicadores",
    title: "Indicadores Mensais",
    subtitle: "Indicadores mensais e consistência dos lançamentos no Elabore por fazenda",
    code: "ELB-IND-01",
    icon: "calendar_month",
    exportName: "indicadores_mensais",
    filters: ["ano", "mes", "prop", "agro", "consistencia", "q"],
    elabore: {
      table: "raw_indicadores_mensais",
      fullSheet: "monthly",
      codeColumn: "labor_rural_code",
      order: "labor_rural_code.asc,reference_month.desc",
      period: { column: "reference_month", kind: "month" },
      consistencyColumn: "consistency_status",
      searchColumns: ["property_entrepreneur_label", "labor_rural_code", "consultant_name", "agroindustry_name"],
      fixedColumns: ["labor_rural_code", "property_entrepreneur_label", "reference_month", "consistency_status"],
    },
    columns: [],
  },

  "indicadores-anuais": {
    slug: "indicadores-anuais",
    group: "Indicadores",
    title: "Indicadores Anuais",
    subtitle: "Cálculo de médias da janela móvel de 12 meses por fazenda",
    code: "ELB-IND-02",
    icon: "date_range",
    exportName: "indicadores_anuais",
    filters: ["ano", "mes", "prop", "agro", "consistencia", "q"],
    elabore: {
      table: "raw_indicadores_anuais",
      fullSheet: "annual",
      codeColumn: "labor_rural_code",
      order: "labor_rural_code.asc,id.asc",
      period: { column: "annual_period", kind: "annual_window" },
      consistencyColumn: "annual_consistency_status",
      searchColumns: ["property_entrepreneur_label", "labor_rural_code", "consultant_name", "agroindustry_name"],
      fixedColumns: ["labor_rural_code", "property_entrepreneur_label", "annual_period", "annual_consistency_status"],
    },
    columns: [],
  },

  "custo-forrageira": {
    slug: "custo-forrageira",
    group: "Indicadores",
    title: "Custo de Forrageira",
    subtitle: "Custo por produção da base forrageira (nominal e deflacionado)",
    code: "ELB-IND-03",
    icon: "grass",
    exportName: "custo_forrageira",
    filters: ["prop", "agro", "q"],
    elabore: {
      table: "raw_custo_forrageira",
      fullSheet: "forrageira",
      codeColumn: "labor_rural_code",
      order: "property_name.asc,area_name.asc,harvest_season.desc",
      searchColumns: ["property_name", "producer_name", "labor_rural_code", "culture_name", "area_name", "harvest_season"],
      fixedColumns: ["labor_rural_code", "property_name", "area_name", "culture_name", "harvest_season"],
    },
    columns: [],
  },
};

export const SCREEN_LIST = Object.values(SCREENS);

/** Obtém valor aninhado por caminho com ponto (ex.: "culture.name"). */
export function getNestedValue(row: Record<string, unknown>, path: string): unknown {
  if (!row) return undefined;
  if (path in row) return row[path];
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, row);
}

