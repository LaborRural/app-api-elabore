// Traduz o texto técnico gravado pelo notebook nas colunas de critérios violados / detalhamento
// ("CCS (AUSENTE/NAN); PRODUCAO/VL (ABAIXO DO MIN <3: 0.0 L/VACA/DIA)") para uma frase legível.
// Nada é descartado: o que não for reconhecido aparece como veio.

const MAX_ITENS = 4;

const SIGLAS = new Set(["ccs", "cpp", "mdo", "vl", "ms", "mn", "pb", "ndt"]);
const PALAVRAS: Record<string, string> = {
  producao: "produção",
  alimentacao: "alimentação",
  proteina: "proteína",
  preco: "preço",
  lactacao: "lactação",
  area: "área",
  nutricao: "nutrição",
  media: "média",
  pecuaria: "pecuária",
  indice: "índice",
  lucratividade: "lucratividade",
};

type Categoria = "ausente" | "abaixo" | "acima" | "incoerente" | "outro";

const ROTULO_CATEGORIA: Record<Categoria, string> = {
  ausente: "Sem informação",
  abaixo: "Abaixo do mínimo esperado",
  acima: "Acima do máximo esperado",
  incoerente: "Valor incoerente",
  outro: "Outros",
};

const ORDEM: Categoria[] = ["ausente", "abaixo", "acima", "incoerente", "outro"];

function num(s: string): string {
  return s.replace(/(\d)\.(\d)/g, "$1,$2");
}

/** "PRODUCAO/VL" -> "Produção/VL"; siglas conhecidas ficam em maiúsculas. */
function nomeIndicador(raw: string): string {
  // Já veio com maiúsculas e minúsculas ("VL/Total de vacas"): mantém como está.
  if (/[a-zà-ú]/.test(raw)) return raw.trim();
  const s = raw.trim().toLowerCase();
  const out = s.replace(/[a-zà-ú]+/g, (w) => (SIGLAS.has(w) ? w.toUpperCase() : (PALAVRAS[w] ?? w)));
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/** Motivo técnico -> categoria + detalhe curto (valor encontrado e limite), já com vírgula decimal. */
function classificar(motivo: string): { cat: Categoria; detalhe: string } {
  const m = motivo.trim();
  if (!m || /AUSENTE|NAN|NULL/i.test(m)) return { cat: "ausente", detalhe: "" };

  const lim = /^(ABAIXO DO M[IÍ]N|ACIMA DO M[AÁ]X)\s*[<>]=?\s*(-?[\d.]+)\s*:\s*(.+)$/i.exec(m);
  if (lim) {
    const cat = /ABAIXO/i.test(lim[1]) ? "abaixo" : "acima";
    const valor = num(lim[3].trim());
    const unidade = valor.replace(/^-?[\d,]+\s*/, "");
    return { cat, detalhe: `${valor}; ${cat === "abaixo" ? "mín." : "máx."} ${num(lim[2])}${unidade ? ` ${unidade}` : ""}` };
  }

  const inc = /^INCONSISTENTE\s*:?\s*(.*)$/i.exec(m);
  if (inc) return { cat: "incoerente", detalhe: num(inc[1].trim()) };

  return { cat: "outro", detalhe: m };
}

/**
 * Agrupa por tipo de problema e resume as listas longas.
 * `completo` lista todos os indicadores (exportações e dica ao passar o mouse).
 */
export function humanizarInconsistencias(texto: string, completo = false): string {
  const grupos = new Map<Categoria, string[]>();
  let temMotivo = false;

  for (const parte of texto.split(";")) {
    const p = parte.trim();
    if (!p) continue;
    const m = /^(.*?)\s*\((.*)\)$/.exec(p);
    const { cat, detalhe } = m ? classificar(m[2]) : { cat: "outro" as Categoria, detalhe: "" };
    if (m) temMotivo = true;
    const nome = nomeIndicador(m ? m[1] : p);
    const item = detalhe ? `${nome} (${detalhe})` : nome;
    grupos.set(cat, [...(grupos.get(cat) ?? []), item]);
  }

  // Só nomes de indicadores (coluna "Critérios violados"): lista direta, sem rótulo de grupo.
  if (!temMotivo) return (grupos.get("outro") ?? []).join(", ");

  return ORDEM.filter((c) => grupos.has(c))
    .map((c) => {
      const itens = grupos.get(c)!;
      const mostrar = completo ? itens : itens.slice(0, MAX_ITENS);
      const resto = itens.length - mostrar.length;
      return `${ROTULO_CATEGORIA[c]}: ${mostrar.join(", ")}${resto > 0 ? ` (+${resto})` : ""}`;
    })
    .join(" | ");
}
