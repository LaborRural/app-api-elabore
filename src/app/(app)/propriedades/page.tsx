import { Suspense } from "react";
import Link from "next/link";
import { apiGet, type Page } from "@/lib/api";

type Property = {
  id_property: string;
  property_name: string;
  legal_name: string | null;
  cnpj: string | null;
  city: string | null;
  uf: string | null;
  is_active: boolean;
  is_approved: boolean;
  labor_rural_code: string | null;
  agroindustry_code: string | null;
};

export default function PropriedadesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  return (
    <section className="space-y-4">
      <h1 className="text-lg font-semibold">Propriedades</h1>
      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <PropriedadesTable searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function PropriedadesTable({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const page = Number((await searchParams).page ?? 1) || 1;
  const data = await apiGet<Page<Property>>("/properties", { page });
  const items = data.items ?? [];
  const pages = data.pages ?? 1;

  return (
    <>
      <p className="text-sm text-muted">{data.total ?? items.length} propriedades</p>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="p-3">Propriedade</th>
              <th className="p-3">Razão social</th>
              <th className="p-3">Cidade/UF</th>
              <th className="p-3">Cód. Labor Rural</th>
              <th className="p-3">Cód. Agroindústria</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id_property} className="border-t border-line">
                <td className="p-3 font-medium">{p.property_name}</td>
                <td className="p-3">{p.legal_name ?? "—"}</td>
                <td className="p-3">{p.city ? `${p.city}/${p.uf ?? ""}` : "—"}</td>
                <td className="p-3">{p.labor_rural_code ?? "—"}</td>
                <td className="p-3">{p.agroindustry_code ?? "—"}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      p.is_active ? "bg-primary text-primary-fg" : "border border-line text-muted"
                    }`}
                  >
                    {p.is_active ? "Ativa" : "Inativa"}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-muted">Nenhum registro</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <nav className="flex items-center gap-3 text-sm">
        {page > 1 && <Link className="text-primary" href={`?page=${page - 1}`}>← Anterior</Link>}
        <span className="text-muted">Página {page} de {pages}</span>
        {page < pages && <Link className="text-primary" href={`?page=${page + 1}`}>Próxima →</Link>}
      </nav>
    </>
  );
}
