export default function PageLoadingState({
  title = "Carregando dados da API Elabore…",
  subtitle = "Aguarde enquanto os dados são carregados",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="elabore-fullscreen-loader" role="status" aria-live="polite">
      <div className="elabore-page-loader-box">
        <div className="elabore-page-loader-spinner" aria-hidden="true" />
        <p className="elabore-page-loader-title">{title}</p>
        <span className="elabore-page-loader-sub">{subtitle}</span>
      </div>
    </div>
  );
}

