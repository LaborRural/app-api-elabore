import { TbCash, TbChecklist, TbDroplet, TbLeaf, TbMap2, TbPlant2 } from "react-icons/tb";
import type { AreaKpi } from "@/lib/area-kpis";
import SummaryCard from "./summary-card";

const ICONS = {
  area: <TbMap2 />,
  irrigated: <TbDroplet />,
  planted: <TbPlant2 />,
  cultures: <TbLeaf />,
  expense: <TbCash />,
  executed: <TbChecklist />,
} as const;

/** Grade de 2 KPIs no padrão Elabore (SummaryCard), usada nas telas do grupo "Áreas". */
export default function AreaKpiGrid({ kpis }: { kpis: AreaKpi[] }) {
  if (kpis.length === 0) return null;
  return (
    <div className="summary-grid" style={{ ["--summary-cols" as string]: 2 }}>
      {kpis.map((k) => (
        <SummaryCard
          key={k.id}
          icon={ICONS[k.icon]}
          label={k.label}
          labelTooltip={k.tooltip}
          value={k.value}
          valueTitle={k.valueTitle}
          subtext={k.subtext}
        />
      ))}
    </div>
  );
}
