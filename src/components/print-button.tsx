"use client";

// Os gráficos (ApexCharts) são desenhados em pixels, na largura da tela. Antes de imprimir, o layout
// é fixado na largura da página A4 paisagem (classe painel-printing) e os gráficos são redesenhados
// nesse tamanho; só então abre a impressão. A classe sai quando a impressão termina.
type Props = { onBeforePrint?: () => void; onAfterPrint?: () => void };

export default function PrintButton({ onBeforePrint, onAfterPrint }: Props) {
  function imprimir() {
    const root = document.documentElement;
    root.classList.add("painel-printing");
    onBeforePrint?.();
    const limpar = () => {
      root.classList.remove("painel-printing");
      window.removeEventListener("afterprint", limpar);
      onAfterPrint?.();
      window.dispatchEvent(new Event("resize"));
    };
    window.addEventListener("afterprint", limpar);
    window.dispatchEvent(new Event("resize"));
    setTimeout(() => window.print(), 900);
  }

  return (
    <button type="button" className="btn-table-export painel-print-hide" onClick={imprimir}>
      <span className="material-symbols-rounded" style={{ fontSize: 17 }}>
        print
      </span>
      <span>Imprimir</span>
    </button>
  );
}
