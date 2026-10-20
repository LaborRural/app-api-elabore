"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MENU_GROUPS, SCREEN_LIST } from "@/lib/screens";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Cadastros: true,
    Áreas: true,
    Lançamentos: true,
    Controles: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem("lr_theme") as "light" | "dark" | null;
    const initial =
      saved ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("lr_theme", next);
    document.documentElement.dataset.theme = next;
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const currentSlug = pathname.replace(/^\//, "").split("/")[0] || "inicio";

  return (
    <div
      className={`elabore-shell ${collapsed ? "sidebar-collapsed" : ""} ${
        mobileOpen ? "mobile-nav-open" : ""
      }`}
    >
      {/* CABEÇALHO SUPERIOR */}
      <header className="elabore-header">
        <div className="elabore-brand">
          <Link href="/inicio" className="elabore-brand-logo">
            <img src="/img/elabore_icone.svg" alt="Elabore" />
            <div className="elabore-brand-title">
              <span>Labor Rural</span>
              <strong>Elabore Dados</strong>
            </div>
          </Link>

          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => {
              if (window.innerWidth <= 960) {
                setMobileOpen((v) => !v);
              } else {
                setCollapsed((v) => !v);
              }
            }}
            title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-label="Alternar menu lateral"
          >
            <span className="material-symbols-rounded">
              {collapsed ? "left_panel_open" : "left_panel_close"}
            </span>
          </button>
        </div>

        <div className="flex flex-1 items-center justify-between gap-4 pl-2">
          <div className="hidden sm:flex flex-col">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--green-700)]">
              BI LABOR RURAL · PORTAL DE CONSULTA E EXPORTAÇÃO
            </span>
            <span className="text-xs font-bold text-[var(--ink-strong)]">
              Consumo de Dados da API Elabore
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <div className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-[#bcead8] bg-[#dff3e9] px-2.5 py-1 text-[10.5px] font-bold text-[#005854]">
              <span className="h-2 w-2 rounded-full bg-[#0f6e56]" />
              <span>API Conectada</span>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-md border border-[var(--line)] bg-[var(--surface-soft)] text-[var(--ink-strong)] hover:border-[var(--green-400)] hover:bg-[var(--green-100)] cursor-pointer transition-colors"
              title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
              aria-label="Alternar tema"
            >
              <span className="material-symbols-rounded">
                {theme === "dark" ? "light_mode" : "dark_mode"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-3 text-xs font-bold text-[var(--ink-strong)] hover:border-[#fecaca] hover:bg-[#feebe9] hover:text-[#991b1b] cursor-pointer transition-colors"
              title="Encerrar sessão"
            >
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                logout
              </span>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* CORPO: MENU LATERAL + CONTEÚDO */}
      <div className="elabore-body">
        <aside className="elabore-sidenav" aria-label="Menu principal do Elabore">
          <Link
            href="/inicio"
            onClick={() => setMobileOpen(false)}
            className={`sn-item-top ${currentSlug === "inicio" ? "active" : ""}`}
            title="Início"
          >
            <span className="material-symbols-rounded">dashboard</span>
            <span className="sn-label flex-1">Início</span>
          </Link>

          <div className="my-1 h-px bg-[var(--line-soft)]" />

          {MENU_GROUPS.map((group) => {
            const groupScreens = SCREEN_LIST.filter((s) => s.group === group.label);
            const isOpen = openGroups[group.label] ?? true;
            const hasActiveChild = groupScreens.some((s) => s.slug === currentSlug);

            return (
              <div key={group.label} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      setOpenGroups((prev) => ({ ...prev, [group.label]: true }));
                    } else {
                      setOpenGroups((prev) => ({
                        ...prev,
                        [group.label]: !prev[group.label],
                      }));
                    }
                  }}
                  className={`sn-group-btn ${hasActiveChild ? "font-bold" : ""}`}
                  title={group.label}
                >
                  <span className="material-symbols-rounded">{group.icon}</span>
                  <span className="sn-label flex-1">{group.label}</span>
                  <span
                    className="material-symbols-rounded sn-chevron transition-transform"
                    style={{
                      fontSize: 16,
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    expand_more
                  </span>
                </button>

                {isOpen && (
                  <div className="sn-group-children">
                    {groupScreens.map((sc) => {
                      const isActive = currentSlug === sc.slug;
                      return (
                        <Link
                          key={sc.slug}
                          href={`/${sc.slug}`}
                          onClick={() => setMobileOpen(false)}
                          className={`sn-subitem ${isActive ? "active" : ""}`}
                        >
                          <span className="truncate">{sc.title}</span>
                          {sc.unavailableReason && (
                            <span
                              className="rounded bg-[var(--surface-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--muted)] border border-[var(--line)]"
                              title="Endpoint ainda não publicado na API"
                            >
                              Em breve
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="sn-footer-box mt-auto pt-4">
            <div className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-soft)] p-2.5 text-[10.5px] text-[var(--muted)]">
              <div className="font-bold text-[var(--ink-strong)]">Exportação Padronizada</div>
              <div className="mt-0.5 leading-snug">
                Planilhas geradas no padrão oficial <code>excel_format</code> (Aptos 11, cabeçalho
                verde #247B72 e listrado).
              </div>
            </div>
          </div>
        </aside>

        <main className="elabore-main">{children}</main>
      </div>

      {/* RODAPÉ OFICIAL LABOR RURAL */}
      <footer className="elabore-footer">
        <div className="flex items-center gap-3">
          <img src="/img/logo-branco.png" alt="Labor Rural" />
        </div>
        <div className="hidden sm:block text-center text-[11px] font-semibold text-white/90">
          Elabore — Consulta e Exportação de Dados
        </div>
        <div className="text-right text-[11px] font-semibold text-white/90">
          © Labor Rural | 2026 — Departamento de Inteligência
        </div>
      </footer>
    </div>
  );
}

