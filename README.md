# Labor Rural — API Elabore (Painel Web e Indicadores)

**Versão Atual:** `v0.7.0`

Interface analítica e painel de inteligência de dados da **Labor Rural**, conectado à API do Elabore e ao banco de dados analítico no Supabase. Permite o acompanhamento operacional, zootécnico e econômico-financeiro de fazendas de pecuária de leite e agroindústrias parceiras.

---

## 🚀 Funcionalidades Principais

- **Painel de Indicadores Mensais (`/indicadores-mensais`)**:
  - Acompanhamento de indicadores de volume de leite (L/dia), produtividade (L/vaca em lactação/dia), qualidade (CCS, CBT, % de gordura e proteína).
  - Gráficos temporais interativos via ApexCharts com seleção de períodos e metas.
  - Relatório impresso em formato padrão A4 para uso por consultores no campo.

- **Painel Anual (`/indicadores-anuais`)**:
  - Consolidação histórica plurianual e médias ponderadas anuais da propriedade.
  - Análise de evolução e comparativo entre safras/anos.

- **Painel de Custo de Forrageira (`/custo-forrageira`)**:
  - Detalhamento de custos operacionais zootécnicos por hectare e tonelada de matéria seca (MS).
  - Abertura por etapas (Implantação, Tratos Culturais, Colheita) e por sistemas de cultivo (Pastejo, Silagem, Feno).

- **Tabelas Analíticas e Exportação**:
  - Visualização tabular detalhada com código Labor Rural fixo na primeira coluna.
  - Exportação direta para planilhas Excel (`.xlsx`) com formatação e download da planilha completa consolidada.
  - Motor de humanização e agrupamento de inconsistências de dados e critérios violados.

- **Arquitetura Visual e Acessibilidade**:
  - Design System oficial Labor Rural (Dark/Light mode persistente).
  - Barra lateral retrátil com accordion de módulos (Cadastros, Operações, Análise).
  - Modal de comunicação de novidades em campo e identificação de usuário logado.

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS v4 & Folha de Estilos Institucional Labor Rural
- **Gráficos e BI**: [ApexCharts](https://apexcharts.com/) / `react-apexcharts`
- **Planilhas e Exportação**: `exceljs`
- **Ícones**: React Icons & Material Symbols Rounded
- **Banco de Dados & Autenticação**: Supabase & Cookie de sessão `httpOnly`

---

## 📦 Como Executar o Projeto

### Pré-requisitos
- Node.js (v20 ou superior recomendado)
- NPM

### Inicialização Rápida no Windows
Execute o script utilitário incluído na raiz:
```cmd
teste_local.bat
```

### Inicialização Manual
1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente:
   ```bash
   copy .env.example .env.local
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000) no seu navegador.

---

## 🧪 Testes de Versionamento

Para validar o padrão oficial de versionamento e integridade das versões e novidades:

```bash
npm run test:version
```
Ou diretamente:
```bash
node --test data/tests/*.test.mjs
```

---

## 📜 Histórico de Versões

Consulte o arquivo [CHANGELOG.md](file:///c:/Users/Guilherme/LABOR%20RURAL/Analytics%20-%20Departamento%20Analytics/REPOSITORIOS_PROJETOS_GIT/APP/app-api-elabore/CHANGELOG.md) para visualizar o mapeamento detalhado de todas as alterações, entregas e versões lançadas neste repositório.

Este projeto segue as diretrizes da skill **`lr-app-versions`** da Labor Rural.
