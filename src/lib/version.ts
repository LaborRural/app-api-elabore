/**
 * Sistema de Controle de Versão e Comunicação de Novidades - Labor Rural
 * Padrão oficial definido em lr-app-versions
 */

export const VERSAO = "0.7.0";

export type TipoNovidade = "novo" | "melhorou" | "corrigido";

export interface ItemNovidade {
  tipo: TipoNovidade;
  texto: string;
}

export interface VersaoNovidades {
  versao: string;
  data: string; // Formato AAAA-MM-DD
  titulo: string;
  itens: ItemNovidade[];
}

/**
 * Histórico recente de novidades exibido aos usuários e consultores no campo.
 * Regras da Labor Rural:
 * 1. Máximo 5 versões na lista, ordenadas da mais recente para a mais antiga.
 * 2. Frases curtas (<= 160 caracteres), sem tags HTML nem nomes de funções internas.
 * 3. Categorias: "novo", "melhorou", "corrigido".
 */
export const NOVIDADES: VersaoNovidades[] = [
  {
    versao: "0.7.0",
    data: "2026-10-22",
    titulo: "Títulos Dinâmicos e Inconsistências de Dados",
    itens: [
      { tipo: "novo", texto: "Atualização automática do título da aba no navegador conforme tela e visão selecionadas." },
      { tipo: "melhorou", texto: "Formatação clara e humanizada dos alertas de inconsistências e critérios violados." },
      { tipo: "melhorou", texto: "Otimização de requisições e carregamento mais ágil dos dados de indicadores." },
    ],
  },
  {
    versao: "0.6.1",
    data: "2026-10-21",
    titulo: "Estabilização dos Painéis e Tooltips",
    itens: [
      { tipo: "corrigido", texto: "Correção de erro nos tooltips interativos dos gráficos da ApexCharts." },
      { tipo: "melhorou", texto: "Pré-carregamento dos arquivos de estilo para navegação mais suave entre telas." },
    ],
  },
  {
    versao: "0.6.0",
    data: "2026-10-21",
    titulo: "Painéis de Indicadores e Custos",
    itens: [
      { tipo: "novo", texto: "Novo Painel de Indicadores Mensais com gráficos de produção, qualidade e rebanho." },
      { tipo: "novo", texto: "Novo Painel Anual com histórico plurianual e consolidação de médias da fazenda." },
      { tipo: "novo", texto: "Novo Painel de Custo de Forrageira com detalhamento por etapa e sistema de cultivo." },
      { tipo: "novo", texto: "Botão de impressão formatada em folha A4 para relatórios de campo." },
    ],
  },
  {
    versao: "0.5.0",
    data: "2026-10-21",
    titulo: "Submenus Painel/Tabela e Dados Enriquecidos",
    itens: [
      { tipo: "novo", texto: "Submenus para alternar entre visão de Painel da fazenda e Tabela de indicadores." },
      { tipo: "melhorou", texto: "Cadastro de propriedades enriquecido com produtor, áreas e códigos amigáveis." },
      { tipo: "melhorou", texto: "Cards de resumo de indicadores e filtros combinados de fazenda e período." },
    ],
  },
  {
    versao: "0.4.0",
    data: "2026-10-21",
    titulo: "Padronização de Códigos e Liberação de Telas",
    itens: [
      { tipo: "novo", texto: "Liberação de todas as telas operacionais do Elabore no menu de navegação." },
      { tipo: "melhorou", texto: "Código Labor Rural padronizado como primeira coluna fixa em todas as tabelas." },
    ],
  },
];

