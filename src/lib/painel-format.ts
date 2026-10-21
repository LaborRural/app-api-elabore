// Formatação compartilhada do painel (usada no servidor e no navegador).

/** "CCS: de 398 (abr/26) a 567 (jan/26)": a frase-resumo sai só dos dados exibidos. */
export function rangeText(
  name: string,
  values: (number | null)[],
  labels: string[],
  decimals: number,
  prefix = "",
): string | null {
  const valid = values.map((v, i) => ({ v, i })).filter((x): x is { v: number; i: number } => x.v !== null);
  if (valid.length === 0) return null;
  const lo = valid.reduce((a, b) => (b.v < a.v ? b : a));
  const hi = valid.reduce((a, b) => (b.v > a.v ? b : a));
  const f = (v: number) =>
    `${prefix}${v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  return lo.i === hi.i
    ? `${name}: ${f(hi.v)} (${labels[hi.i]})`
    : `${name}: de ${f(lo.v)} (${labels[lo.i]}) a ${f(hi.v)} (${labels[hi.i]})`;
}

/**
 * Rótulos nunca podem se sobrepor: com muitos meses cada coluna fica estreita demais para um
 * rótulo por mês, então mostra um a cada `step` (o tooltip segue mostrando todos).
 */
export function labelStep(count: number): number {
  return count > 24 ? 3 : count > 14 ? 2 : 1;
}
