# Registro de Alterações (Changelog) — API Elabore

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/) (`MAIOR.MENOR.CORREÇÃO`):
- **MAIOR**: Alterações incompatíveis ou homologação definitiva em campo (`1.0.0`).
- **MENOR**: Adição de novas funcionalidades retrocompatíveis (`0.7.0`).
- **CORREÇÃO**: Correções de defeitos e ajustes internos retrocompatíveis (`0.6.1`).

Este repositório segue rigorosamente o padrão institucional **`lr-app-versions`** da Labor Rural.

---

## [Não lançado]

### Adicionado
- **Botão com Animação de Download (`FullSheetButton`)**: Componente interativo (`src/components/full-sheet-button.tsx`) com estado de carregamento e feedback visual contínuo enquanto a planilha completa é gerada e transferida.
- **Animações CSS de Transferência**: Novas regras em `src/app/toolbar-table.css` com keyframes `@keyframes lrDownloadArrow` e `@keyframes lrDownloadBar`, além da classe `.is-downloading`.
- **Módulo Central de Versão**: Criação de `src/lib/version.ts` com constantes `VERSAO` e histórico estruturado `NOVIDADES` para sincronização em todo o app.
- **Testes de Integridade de Versão**: Suíte de testes automatizados em `data/tests/versao.test.mjs` e `data/tests/novidades.test.mjs` para garantir conformidade contínua com as regras da Labor Rural.

### Modificado
- **Painéis e Tabelas**: Integração do `FullSheetButton` nos componentes `PainelAnual`, `PainelCusto`, `PainelMensal` e `ScreenTable`.
- **Badges de Consistência**: Ajuste visual em `src/components/screen-table.tsx` para destacar respostas afirmativas (`badge-positive`) e negativas (`badge-danger`).
- **Humanização de Inconsistências**: Suporte a termos acentuados (`MÍN`, `MÁX`) e preservação do formato original quando já formatado em maiúsculas e minúsculas em `src/lib/inconsistencias.ts`.

---

## [0.7.0] - 2026-10-22

### Adicionado
- **Motor de Inconsistências (`src/lib/inconsistencias.ts`)**: Módulo para parsing, categorização (abaixo, acima, ausente, outro) e humanização das inconsistências técnicas e violadas em indicadores de campo.
- **Títulos Dinâmicos de Página**: Atualização automática de `document.title` no navegador conforme o menu, visão (Painel vs Tabela) e filtro selecionado.

### Modificado
- **Otimização de Indicadores**: Reestruturação das rotas de consulta em `src/lib/api.ts` e `src/lib/elabore-data.ts` para reduzir chamadas redundantes e acelerar renderização.
- **Refinamento de Facets**: Filtros e agrupadores do `painel-facets.tsx` com atualização reativa e suporte aprimorado a seleções múltiplas.
- **Exportação Formatada**: Ajustes nas rotas de exportação para refletir as novas colunas e rótulos de inconsistências.

*(Commit: `4dd8a15`)*

---

## [0.6.1] - 2026-10-21

### Corrigido
- **Tooltips no ApexCharts**: Resolução de exceção nula no seletor de elementos `ttItems` durante navegações rápidas e hover em gráficos interativos.
- **Estabilização de Build**: Remoção de referências circulares e unificação das alterações no Pull Request #1 (`desenvolvimento-completo`).

### Modificado
- **Preload de Estilos**: Inclusão de links de preload de CSS no `src/app/layout.tsx` para evitar saltos visuais durante a troca de abas.

*(Commits: `9b33720`, `358c972`, `f141a97`, `8df2738`)*

---

## [0.6.0] - 2026-10-21

### Adicionado
- **Painel de Indicadores Mensais (`painel-mensal.tsx`)**: Dashboard analítico com cards de KPI (Volume de leite, Produtividade, Rebanho, Indicadores de Qualidade CCS/CBT), gráficos temporais e tabela mensal consolidada.
- **Painel Anual (`painel-anual.tsx`)**: Visão consolidada plurianual com médias anuais da propriedade e gráficos de evolução histórica.
- **Painel de Custo de Forrageira (`painel-custo.tsx`, `painel-custo-tabela.tsx`)**: Análise de custos zootécnicos por hectare e tonelada de matéria seca (MS), segmentado por etapas (Implantação, Tratos Culturais, Colheita) e sistemas de cultivo (Pastejo, Silagem, Feno).
- **Relatório Impresso / PDF**: Botão e motor de impressão (`src/components/print-button.tsx`) formatado especificamente para saída em folha A4 em campo.
- **Painel Dinâmico e Facets**: Componentes `painel-dinamico.tsx` e `painel-facets.tsx` para montagem modular de visões analíticas.

*(Commit: `e407295`)*

---

## [0.5.0] - 2026-10-21

### Adicionado
- **Submenus de Navegação**: Separação clara na barra lateral entre **Painel da fazenda** (visão gráfica/analítica) e **Tabela de indicadores** (visão detalhada em planilha).
- **Enriquecimento Cadastral**: Associação de propriedades a produtores, áreas de culturas agrícolas, áreas de pastagem e códigos de identificação amigáveis.
- **Dependências de Visualização de Dados**: Instalação e configuração de `apexcharts` e `react-apexcharts`.
- **Cards de Resumo de Indicadores**: Componente `src/components/summary-card.tsx` com variações percentuais (deltas), formatação monetária e compacta.

### Modificado
- **Renomeação do Projeto**: Ajuste oficial de nomenclatura para `app-api-elabore`.

*(Commits: `b61eeb9`, `fe52e6e`, `63a14c7`)*

---

## [0.4.0] - 2026-10-21

### Adicionado
- **Código Labor Rural**: Inclusão do Código LR como primeira coluna fixa e identificador visual primário em todas as tabelas analíticas.
- **Liberação de Telas Operacionais**: Habilitação irrestrita de todas as telas de cadastros, lançamentos e movimentações no menu lateral, substituindo avisos de "Em construção".

*(Commits: `0b4def2`, `5aae982`)*

---

## [0.3.1] - 2026-10-21

### Adicionado
- **Usuário Logado no Cabeçalho**: Exibição dinâmica do nome, iniciais em avatar e papel (Consultor / Gestor / Administrador) na barra superior do `AppShell`.
- **Menu de Perfil e Logout**: Dropdown com dados da sessão e acionamento da rota `/api/auth/logout`.

*(Commits: `67a8656`, `6a6c882`, `67cdf75`)*

---

## [0.3.0] - 2026-10-20

### Adicionado
- **Módulo de Indicadores Mensais**: Processamento e renderização dos dados da API de indicadores mensais e planilhas de referência.
- **Login Institucional**: Tela de autenticação reformulada com seleção dinâmica de imagens de fundo temáticas do campo (cacau, café, milho, grão, pecuária de leite).
- **Estrutura de Exportação**: Rota `/api/export/[tela]` para download de relatórios em Excel (`exceljs`).
- **Cliente Supabase**: Inicialização da camada de integração direta com o Supabase (`src/lib/supabase.ts`).

*(Commit: `a0a47ac`)*

---

## [0.2.0] - 2026-10-20

### Adicionado
- **Design System Labor Rural**: Aplicação da paleta institucional (Emerald, Navy, Amber, Slate) e folha de estilos global `globals.css`.
- **Casca da Aplicação (`AppShell`)**: Barra lateral expansível/retrátil com agrupamento em accordion por módulos (Cadastros, Operações, Análise).
- **Alternador de Tema Claro/Escuro**: Suporte a `data-theme="light"` e `data-theme="dark"` com persistência no `localStorage`.
- **Filtros Globais (`ScreenFilters`)**: Seletor integrado de ano, mês, propriedade e agroindústria.
- **Tabela Genérica Reutilizável (`ScreenTable`)**: Paginação, busca rápida, ordenação por colunas e suporte a células numéricas formatadas.
- **Página Inicial (`/inicio`)**: Painel de boas-vindas com cards de atalho rápido e status do sistema.

*(Commit: `3bbf6c5`)*

---

## [0.1.0] - 2026-10-14

### Adicionado
- **Scaffold Inicial do Frontend**: Estrutura base com Next.js (App Router), Tailwind CSS e TypeScript.
- **Autenticação Segura**: Fluxo de login com credenciais e sessão armazenada via cookie `httpOnly`.
- **Proxy de API**: Rota `/api/[...path]` atuando como backend proxy reverso autenticado para a API do Elabore.
- **Listagem de Propriedades**: Primeira tela funcional de consulta paginada de propriedades rurais.
- **Script de Inicialização Local**: Utilitário `teste_local.bat` para verificação de ambiente, criação de `.env.local` e execução.

*(Commit: `22ca778`)*

---

## [0.0.1] - 2026-10-14

### Adicionado
- **Inicialização do Repositório**: Boilerplate gerado a partir de `create-next-app` com TypeScript, ESLint e Tailwind CSS.

*(Commit: `664d7e3`)*

