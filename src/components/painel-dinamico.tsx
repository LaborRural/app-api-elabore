"use client";

import { useState } from "react";
import { rangeText } from "@/lib/painel-format";
import PainelFacets from "./painel-facets";
import { SelectBox } from "./screen-filters";

export type DynIndicator = {
  id: string;
  /** Texto do botão de opção, ex.: "Vacas em lactação (animais/mês)". */
  radioLabel: string;
  /** Título do gráfico, ex.: "Vacas em lactação (animal)". */
  titleLabel: string;
  /** Nome e unidade no painel, ex.: "Vacas em lactação" e "animal". */
  name: string;
  unit: string;
  decimals: number;
  values: (number | null)[];
};

export type DynCost = {
  id: string;
  /** Texto da opção, ex.: "Consumo de volumosos (R$/litro)". */
  label: string;
  name: string;
  values: (number | null)[];
};

type Props = { labels: string[]; indicators: DynIndicator[]; costs: DynCost[] };

/**
 * "Configurar gráfico dinâmico" do painel antigo: o indicador em colunas e o elemento de custo
 * em linha são escolhidos ao lado. Cada medida continua com o seu próprio eixo (dois painéis).
 */
export default function PainelDinamico({ labels, indicators, costs }: Props) {
  const [indicatorId, setIndicatorId] = useState(indicators[0].id);
  const [costId, setCostId] = useState(costs[0].id);
  const indicator = indicators.find((i) => i.id === indicatorId) ?? indicators[0];
  const cost = costs.find((c) => c.id === costId) ?? costs[0];

  const takeaway =
    [
      rangeText(indicator.name, indicator.values, labels, indicator.decimals),
      rangeText(cost.name, cost.values, labels, 2, "R$ "),
    ]
      .filter(Boolean)
      .join(" · ") || "Sem dados no período";

  return (
    <section className="painel-dinamico" aria-label="Gráfico dinâmico">
      <PainelFacets
        id="dinamico"
        labelAll
        title={`${indicator.titleLabel} e ${cost.label}`}
        takeaway={takeaway}
        labels={labels}
        facets={[
          { name: indicator.name, unit: indicator.unit, color: "#004d49", values: indicator.values, kind: "bar", decimals: indicator.decimals },
          { name: cost.name, unit: "R$/litro", color: "#29927d", values: cost.values, kind: "line", decimals: 2 },
        ]}
      />

      <aside className="panel-card painel-config">
        <h2>Configurar Gráfico Dinâmico</h2>
        <fieldset>
          <legend>Indicador (colunas)</legend>
          {indicators.map((i) => (
            <label key={i.id} className="painel-radio">
              <input type="radio" name="painel-indicador" checked={i.id === indicatorId} onChange={() => setIndicatorId(i.id)} />
              <span>{i.radioLabel}</span>
            </label>
          ))}
        </fieldset>
        <SelectBox
          label="Elementos do custo (linha)"
          placeholder="Escolha o custo"
          options={costs.map((c) => ({ value: c.id, label: c.label }))}
          values={[costId]}
          onChange={(v) => v[0] && setCostId(v[0])}
        />
      </aside>
    </section>
  );
}
