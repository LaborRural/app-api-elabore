"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MENU_GROUPS, SCREEN_LIST } from "@/lib/screens";
import { NavIcon } from "@/components/nav-icon";

// Telas com mais de uma visão: aparecem no menu como um título com submenus.
// "soon" marca visões ainda não publicadas (aparecem sem link, com selo "Breve").
type SubItem = { label: string; href: string; view: "painel" | "tabela"; soon?: boolean };
const SUBMENUS: Record<string, SubItem[]> = {
  "indicadores-mensais": [
    { label: "Painel da fazenda", href: "/indicadores-mensais", view: "painel" },
    { label: "Tabela de indicadores", href: "/indicadores-mensais?view=tabela", view: "tabela" },
  ],
  "indicadores-anuais": [
    { label: "Painel anual", href: "/indicadores-anuais", view: "painel" },
    { label: "Tabela de médias", href: "/indicadores-anuais?view=tabela", view: "tabela" },
  ],
  "custo-forrageira": [
    { label: "Painel de custos", href: "/custo-forrageira", view: "painel" },
    { label: "Tabela de custos", href: "/custo-forrageira?view=tabela", view: "tabela" },
  ],
};

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { nome: string; iniciais: string; papel: string } | null;
}) {
  const userNome = user?.nome ?? "Usuário";
  const userIniciais = user?.iniciais ?? "LR";
  const userPapel = user?.papel ?? "Consultor";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewParam = searchParams.get("view");

  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const currentSlug = pathname.replace(/^\//, "").split("/")[0] || "inicio";

  // Identifica o grupo da tela atual para mantê-lo aberto no accordion
  const currentScreenDef = SCREEN_LIST.find((s) => s.slug === currentSlug);
  const initialGroup = currentScreenDef ? currentScreenDef.group : "Cadastros";
  const [activeGroup, setActiveGroup] = useState<string | null>(initialGroup);

  // Submenu aberto (um por vez): começa na tela atual, se ela tiver submenus.
  const [openSub, setOpenSub] = useState<string | null>(SUBMENUS[currentSlug] ? currentSlug : null);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Inicialização do tema
  useEffect(() => {
    const saved = localStorage.getItem("lr_theme") as "light" | "dark" | null;
    // Tema claro é o padrão; o escuro só vale se o usuário o escolheu no menu.
    const initial = saved ?? "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  // Fechamento de menus ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sincroniza grupo ativo quando a rota muda
  useEffect(() => {
    if (currentScreenDef) {
      setActiveGroup(currentScreenDef.group);
    }
  }, [currentSlug, currentScreenDef]);

  useEffect(() => {
    if (SUBMENUS[currentSlug]) setOpenSub(currentSlug);
  }, [currentSlug]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("lr_theme", next);
    document.documentElement.dataset.theme = next;
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  // Lista sequencial para navegação mobile (< bnav >)
  const navOrder = ["inicio", ...SCREEN_LIST.map((s) => s.slug)];
  const currentIndex = navOrder.indexOf(currentSlug);
  const prevSlug = currentIndex > 0 ? navOrder[currentIndex - 1] : null;
  const nextSlug = currentIndex < navOrder.length - 1 ? navOrder[currentIndex + 1] : null;

  // Só o Painel da fazenda existe por enquanto; nas demais telas a visão ativa é sempre a tabela.
  const currentView = (currentSlug === "indicadores-mensais" || currentSlug === "indicadores-anuais" || currentSlug === "custo-forrageira") && viewParam !== "tabela" ? "painel" : "tabela";

  // Fazenda, período e agroindústria escolhidos seguem junto ao alternar entre Painel e Tabela.
  function subHref(sub: SubItem) {
    const [path, query = ""] = sub.href.split("?");
    const qs = new URLSearchParams(query);
    for (const key of ["prop", "ano", "mes", "agro"]) {
      const v = searchParams.get(key);
      if (v) qs.set(key, v);
    }
    const out = qs.toString();
    return out ? `${path}?${out}` : path;
  }

  const currentTitle =
    currentSlug === "inicio"
      ? "Início"
      : SUBMENUS[currentSlug] && currentScreenDef
        ? `${currentScreenDef.title} - ${SUBMENUS[currentSlug].find((s) => s.view === currentView)?.label ?? ""}`
        : currentScreenDef?.title || "Elabore";

  useEffect(() => {
    document.title = `${currentTitle} | API Elabore | Labor Rural`;
  }, [currentTitle]);

  return (
    <div className={`elabore-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* CABEÇALHO SUPERIOR (PADRÃO CASCA.CSS / FAIXA) */}
      <header className="elabore-header">
        <div className="hd-marca">
          <Link href="/inicio" className="logos" title="Início - Labor Rural Elabore">
            <img src="/img/elabore_icone.svg" alt="Labor Rural" />
            <h1>
              <span>Labor Rural</span>
              <strong>Elabore Dados</strong>
            </h1>
          </Link>

          <button
            type="button"
            className="hd-lado"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-label="Alternar menu lateral"
          >
            {collapsed ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}>
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m14 9 3 3-3 3" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0 }}>
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m16 15-3-3 3-3" />
              </svg>
            )}
          </button>
        </div>

        {/* Informações centrais do cabeçalho */}
        <div className="hidden sm:flex flex-col pl-2">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-[var(--green-700)]">
            BI LABOR RURAL · {currentScreenDef ? currentScreenDef.group.toUpperCase() : "PORTAL DE CONSULTA E EXPORTAÇÃO"}
          </span>
          <span className="text-xs font-bold text-[var(--ink-strong)]">
            {currentSlug === "inicio" ? "Visão Geral - Dados do Elabore" : currentTitle}
          </span>
        </div>

        {/* Lado direito do cabeçalho */}
        <div className="ml-auto flex items-center gap-3">
          {/* Chip de Conexão */}
          <div className="hd-chip" title="Serviço conectado à API do Elabore">
            <span className="fdot" />
            <span>API Conectada</span>
          </div>

          {/* Menu Dropdown do Usuário (Desktop) */}
          <div className="hd-user" ref={userMenuRef}>
            <button
              type="button"
              className="hd-user-b"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-expanded={userMenuOpen}
              aria-haspopup="true"
              title="Menu do usuário"
            >
              <span className="hd-avatar">{userIniciais}</span>
              <span className="hd-user-t">
                <b>{userNome}</b>
                <small>{userPapel}</small>
              </span>
              <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
                expand_more
              </span>
            </button>

            <div className="hd-menu" hidden={!userMenuOpen} role="menu">
              <Link
                href="/inicio"
                onClick={() => setUserMenuOpen(false)}
                role="menuitem"
              >
                <NavIcon name="inicio" size={17} />
                <span>Painel Inicial</span>
              </Link>
              <button type="button" onClick={toggleTheme} role="menuitem">
                <span className="material-symbols-rounded" style={{ fontSize: 17 }}>
                  {theme === "dark" ? "light_mode" : "dark_mode"}
                </span>
                <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="hdm-sair"
                role="menuitem"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 17 }}>
                  logout
                </span>
                <span>Sair</span>
              </button>
            </div>
          </div>

          {/* Menu Topo Mobile (<= 860px) */}
          <div className="hd-menu-wrap" ref={mobileMenuRef}>
            <button
              type="button"
              className={`hd-menu-btn ${mobileMenuOpen ? "ativo" : ""}`}
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Opções do portal"
              aria-expanded={mobileMenuOpen}
            >
              <span className="material-symbols-rounded">menu</span>
            </button>

            <div
              className="hd-menu-backdrop"
              hidden={!mobileMenuOpen}
              onClick={() => setMobileMenuOpen(false)}
            />

            <div className="hd-menu-dropdown" hidden={!mobileMenuOpen} role="menu">
              <div className="hdm-header">
                <div className="hdm-avatar">{userIniciais}</div>
                <div className="hdm-user-info">
                  <div className="hdm-nome">{userNome}</div>
                  <div className="hdm-papel-tag">{userPapel}</div>
                </div>
              </div>

              <div className="hdm-status-box">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
                  <span className="fdot" />
                  <span>API Conectada</span>
                </div>
                <span className="text-[10px] font-bold uppercase text-[var(--green-700)]">
                  Online
                </span>
              </div>

              <div className="hdm-acoes">
                <Link
                  href="/inicio"
                  className="hdm-item"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <NavIcon name="inicio" size={17} />
                  <span>Visão Geral</span>
                </Link>

                <button type="button" className="hdm-item" onClick={toggleTheme}>
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                    {theme === "dark" ? "light_mode" : "dark_mode"}
                  </span>
                  <span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
                </button>

                <button
                  type="button"
                  className="hdm-item hdm-item--sair"
                  onClick={handleLogout}
                >
                  <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                    logout
                  </span>
                  <span>Sair</span>
                </button>
              </div>

              <div className="hdm-footer">
                <span>© Labor Rural</span>
                <span>Versão 1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* CORPO: MENU LATERAL + CONTEÚDO */}
      <div className="elabore-body">
        <aside className="sidenav" aria-label="Menu principal do Elabore">
          {/* Item Topo: Início */}
          <Link
            href="/inicio"
            className={`gchip ${currentSlug === "inicio" ? "sel" : ""}`}
            title="Início"
          >
            <NavIcon name="inicio" size={17} />
            <span className="gt">Início</span>
          </Link>

          <div className="sn-divisor" />

          {/* Grupos Accordion (Padrão abrirGrupoMenu de casca.css: só um aberto por vez) */}
          {MENU_GROUPS.map((group) => {
            const groupScreens = SCREEN_LIST.filter((s) => s.group === group.label);
            const isOpen = activeGroup === group.label;

            return (
              <div
                key={group.label}
                className={`sn-grupo ${isOpen ? "aberto" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) {
                      setCollapsed(false);
                      setActiveGroup(group.label);
                    } else {
                      setActiveGroup(isOpen ? null : group.label);
                    }
                  }}
                  className="sn-tit"
                  aria-expanded={isOpen}
                  title={group.label}
                >
                  <NavIcon name={group.label} size={17} />
                  <span className="sn-nome">{group.label}</span>
                  <svg
                    className="sn-chevron"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    style={{
                      width: 16,
                      height: 16,
                      minWidth: 16,
                      minHeight: 16,
                      flexShrink: 0,
                      marginLeft: "auto",
                      transition: "transform 160ms ease",
                    }}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="sn-itens">
                    {groupScreens.map((sc) => {
                      const isActive = currentSlug === sc.slug;
                      const subs = SUBMENUS[sc.slug];
                      const subOpen = openSub === sc.slug;
                      if (subs) {
                        return (
                          <div key={sc.slug} className="sn-sub">
                            <button
                              type="button"
                              className="sn-sub-tit"
                              aria-expanded={subOpen}
                              onClick={() => setOpenSub(subOpen ? null : sc.slug)}
                            >
                              <span>{sc.title}</span>
                              <svg className="sn-sub-seta" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14, flexShrink: 0, transition: "transform 160ms ease", transform: subOpen ? "rotate(180deg)" : "none" }}>
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </button>
                            {subOpen && subs.map((sub) =>
                              sub.soon ? (
                                <span key={sub.view} className="gchip sn-sub-item sn-sub-soon" title="Ainda não publicado">
                                  <span className="gt">{sub.label}</span>
                                  <span className="rounded bg-[var(--panel2)] px-1 py-0.2 text-[8.5px] font-bold text-[var(--muted)] border border-[var(--line-soft)] ml-auto">
                                    Breve
                                  </span>
                                </span>
                              ) : (
                                <Link
                                  key={sub.view}
                                  href={subHref(sub)}
                                  className={`gchip sn-sub-item ${isActive && currentView === sub.view ? "sel" : ""}`}
                                  title={`${sc.title} · ${sub.label}`}
                                >
                                  <span className="gt">{sub.label}</span>
                                </Link>
                              ),
                            )}
                          </div>
                        );
                      }
                      return (
                        <Link
                          key={sc.slug}
                          href={`/${sc.slug}`}
                          className={`gchip ${isActive ? "sel" : ""}`}
                          title={sc.title}
                        >
                          <span className="gt">{sc.title}</span>
                          {sc.unavailableReason && (
                            <span
                              className="rounded bg-[var(--panel2)] px-1 py-0.2 text-[8.5px] font-bold text-[var(--muted)] border border-[var(--line-soft)] ml-auto"
                              title="Endpoint ainda não publicado na API"
                            >
                              Breve
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

          <div className="sn-divisor" />

          {/* Botão Sair */}
          <button
            type="button"
            onClick={handleLogout}
            className="gchip sn-sair"
            title="Encerrar sessão"
          >
            <svg
              className="ic-svg"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
              style={{ width: 17, height: 17, minWidth: 17, minHeight: 17, flexShrink: 0 }}
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="gt">Sair</span>
          </button>

          {/* Rodapé da Sidebar */}
          <div className="sn-rodape-versao">
            <span className="sn-novidades-btn">
              <svg
                className="ic-svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                style={{ width: 12, height: 12, minWidth: 12, minHeight: 12, flexShrink: 0 }}
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <span>Elabore API</span>
            </span>
            <div className="sn-versao">Versão 1.0.0</div>
          </div>
        </aside>

        {/* Conteúdo Principal */}
        <main className="elabore-main">{children}</main>
      </div>

      {/* RODAPÉ OFICIAL (PADRÃO FOOTER.FT / ELABORE) */}
      <footer className="elabore-footer">
        <div className="flex items-center gap-3">
          <img src="/img/logo-branco.png" alt="Labor Rural" />
        </div>
        <div className="text-right text-[11.2px] font-semibold text-white/90">
          © Labor Rural | Departamento de Inteligência | 2026
        </div>
      </footer>

      {/* BARRA INFERIOR DE NAVEGAÇÃO MOBILE (PADRÃO BNAV / MOBILE.CSS) */}
      <nav className="bnav" aria-label="Navegação entre telas">
        <button
          className="bnb"
          type="button"
          disabled={!prevSlug}
          onClick={() => prevSlug && router.push(`/${prevSlug}`)}
          aria-label="Tela anterior"
        >
          &#8249;
        </button>

        <button
          className="bnc"
          type="button"
          onClick={() => setMobileSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={mobileSheetOpen}
        >
          <NavIcon name={currentSlug} size={17} />
          <span>{currentTitle}</span>
          <i aria-hidden="true">&#9650;</i>
        </button>

        <button
          className="bnb"
          type="button"
          disabled={!nextSlug}
          onClick={() => nextSlug && router.push(`/${nextSlug}`)}
          aria-label="Próxima tela"
        >
          &#8250;
        </button>
      </nav>

      {/* FOLHA MODAL MOBILE DE SEÇÕES (PADRÃO FOLHA / MOBILE.CSS) */}
      <div
        className="folha"
        hidden={!mobileSheetOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Navegação entre módulos"
      >
        <div
          className="folha-fundo"
          onClick={() => setMobileSheetOpen(false)}
        />
        <div className="folha-cx">
          <div className="folha-tit">
            <span>Navegação</span>
            <button
              className="folha-x"
              type="button"
              onClick={() => setMobileSheetOpen(false)}
              aria-label="Fechar"
            >
              &#10005;
            </button>
          </div>

          <div className="folha-b">
            {/* Atalho Início */}
            <Link
              href="/inicio"
              onClick={() => setMobileSheetOpen(false)}
              className={`fl-chip ${currentSlug === "inicio" ? "sel" : ""}`}
            >
              <div className="flex items-center gap-2.5">
                <NavIcon name="inicio" size={17} />
                <span className="gt">Início</span>
              </div>
            </Link>

            {/* Grupos com Categorias */}
            {MENU_GROUPS.map((group) => {
              const groupScreens = SCREEN_LIST.filter((s) => s.group === group.label);
              const isOpen = activeGroup === group.label;

              return (
                <div
                  key={group.label}
                  className={`fl-secao-grp ${isOpen ? "" : "colapsado"}`}
                >
                  <button
                    type="button"
                    className="fl-secao-tit"
                    onClick={() => setActiveGroup(isOpen ? null : group.label)}
                  >
                    <span className="fl-secao-tit-esq">
                      <span className="fl-secao-ic">
                        <NavIcon name={group.label} size={17} />
                      </span>
                      <span className="fl-secao-tit-txt">{group.label}</span>
                    </span>
                    <span className="fl-secao-tit-dir">
                      <span className="fl-secao-count">{groupScreens.length}</span>
                      <svg
                        className="fl-secao-seta"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          width: 16,
                          height: 16,
                          flexShrink: 0,
                          transition: "transform 160ms ease",
                          transform: isOpen ? "rotate(180deg)" : "none",
                        }}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </button>

                  <div className="fl-secao-col">
                    {groupScreens.map((sc) => {
                      const isActive = currentSlug === sc.slug;
                      const subs = SUBMENUS[sc.slug];
                      const subOpen = openSub === sc.slug;
                      if (subs) {
                        return (
                          <div key={sc.slug} className="sn-sub">
                            <button
                              type="button"
                              className="sn-sub-tit"
                              aria-expanded={subOpen}
                              onClick={() => setOpenSub(subOpen ? null : sc.slug)}
                            >
                              <span>{sc.title}</span>
                              <svg className="sn-sub-seta" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: 14, height: 14, flexShrink: 0, transition: "transform 160ms ease", transform: subOpen ? "rotate(180deg)" : "none" }}>
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </button>
                            {subOpen && subs.map((sub) =>
                              sub.soon ? (
                                <span key={sub.view} className="fl-chip sn-sub-item sn-sub-soon">
                                  <span className="gt">{sub.label}</span>
                                  <span className="text-[9px] text-[var(--muted)] ml-auto">Em breve</span>
                                </span>
                              ) : (
                                <Link
                                  key={sub.view}
                                  href={subHref(sub)}
                                  onClick={() => setMobileSheetOpen(false)}
                                  className={`fl-chip sn-sub-item ${isActive && currentView === sub.view ? "sel" : ""}`}
                                >
                                  <span className="gt">{sub.label}</span>
                                </Link>
                              ),
                            )}
                          </div>
                        );
                      }
                      return (
                        <Link
                          key={sc.slug}
                          href={`/${sc.slug}`}
                          onClick={() => setMobileSheetOpen(false)}
                          className={`fl-chip ${isActive ? "sel" : ""}`}
                        >
                          <span className="gt">{sc.title}</span>
                          {sc.unavailableReason && (
                            <span className="text-[9px] text-[var(--muted)] ml-auto">
                              Em breve
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
