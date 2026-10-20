"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Mosaico inclinado: poucas colunas de fotos grandes e nítidas, escurecidas
// por uma única camada verde (referência: login do Elabore em produção).
const MOSAIC_COLUMNS = [
  {
    offset: "-mt-24",
    images: ["VACA_1", "CAFE_1", "MILHO_1", "CONSULTOR_2", "VACA_3", "GRAO_1"],
  },
  {
    offset: "mt-10",
    images: ["CACAU_1", "CONSULTOR_1", "GRAO_1", "VACA_2", "MILHO_3", "CAFE_1"],
  },
  {
    offset: "-mt-12",
    images: ["MILHO_3", "VACA_2", "CAFE_1", "CACAU_1", "VACA_3", "CONSULTOR_1"],
  },
  {
    offset: "mt-20",
    images: ["CONSULTOR_2", "MILHO_1", "VACA_1", "GRAO_1", "CACAU_1", "VACA_2"],
  },
  {
    offset: "-mt-6",
    images: ["GRAO_1", "VACA_3", "CONSULTOR_1", "CAFE_1", "MILHO_1", "VACA_1"],
  },
].map((c) => ({ ...c, images: c.images.map((n) => `/img/auth/${n}.jpg`) }));

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: f.get("email"),
        password: f.get("password"),
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.replace("/inicio");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "E-mail ou senha inválidos.");
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#002f2b] flex items-center justify-center selection:bg-[#004d49] selection:text-white">
      {/* Background Tilted Mosaic Grid */}
      <div
        aria-hidden="true"
        className="fixed inset-[-25%] z-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
      >
        <div className="flex gap-5 md:gap-6 transform -rotate-[20deg]">
          {MOSAIC_COLUMNS.map((col, colIdx) => (
            <div
              key={colIdx}
              className={`flex flex-col gap-5 md:gap-6 w-[300px] sm:w-[340px] md:w-[400px] ${col.offset}`}
            >
              {col.images.map((imgSrc, imgIdx) => (
                <div
                  key={imgIdx}
                  className="relative w-full aspect-[3/2] rounded-2xl md:rounded-3xl overflow-hidden shadow-xl bg-[#003833]"
                >
                  <img
                    src={imgSrc}
                    alt=""
                    loading="eager"
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Emerald Brand Overlay with rich depth */}
        <div className="absolute inset-0 bg-[#00473e]/70" />
      </div>

      {/* Top Header link: Precisa de ajuda? */}
      <header className="absolute top-6 right-6 md:right-10 z-20">
        <a
          href="https://laborrural.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-white/95 hover:text-white text-base sm:text-lg font-bold tracking-wide transition-colors"
        >
          <svg
            className="w-6 h-6 text-white/95"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Precisa de ajuda?</span>
        </a>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 w-full min-h-screen px-6 py-16 grid grid-cols-1 lg:grid-cols-2 items-center justify-items-center gap-10 lg:gap-0">
        {/* Left Side: Elabore Brand & Tagline (centralizada na metade esquerda) */}
        <div
          role="img"
          aria-label="API Elabore · inteligência para o agronegócio"
          className="w-[240px] sm:w-[320px] lg:w-[380px] xl:w-[460px] flex flex-col items-center drop-shadow-xl"
        >
          {/* A logo é uma imagem única; aqui são usados só o ícone (topo) e o
              slogan (base), e a palavra "elabore" é trocada por "API Elabore". */}
          <div className="relative w-full overflow-hidden aspect-[469/153]">
            <img src="/img/elabore-logo-build.svg" alt="" className="absolute left-0 top-0 w-full h-auto max-w-none" />
          </div>
          <p className="my-[4%] text-white font-bold leading-none tracking-tight whitespace-nowrap text-[38px] sm:text-[50px] lg:text-[60px] xl:text-[72px]">
            API Elabore
          </p>
          <div className="relative w-full overflow-hidden aspect-[469/53]">
            <img
              src="/img/elabore-logo-build.svg"
              alt=""
              className="absolute left-0 w-full h-auto max-w-none"
              style={{ top: "-526%" }}
            />
          </div>
        </div>

        {/* Right Side: Login Card (centralizado na metade direita) */}
        <div className="w-full flex items-center justify-center">
          <div className="w-full max-w-[390px] bg-white rounded-2xl shadow-2xl p-7 sm:p-8 text-[#162640]">
            <h2 className="text-2xl sm:text-[26px] font-bold text-[#162640] mb-5">
              Seja bem-vindo(a)!
            </h2>

            {expired && !error && (
              <div
                role="status"
                className="mb-4 rounded-lg border border-[#fde68a] bg-[#fff8e6] px-3.5 py-2.5 text-xs font-semibold text-[#8c5304]"
              >
                Sua sessão expirou. Faça login novamente para continuar.
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="ptEmail"
                  className="block text-xs font-semibold text-[#334155] mb-1.5"
                >
                  E-mail ou CPF *
                </label>
                <input
                  id="ptEmail"
                  name="email"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="E-mail ou CPF"
                  className="w-full h-11 px-3.5 rounded-lg border border-[#cbd5e1] text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#004d49] focus:ring-2 focus:ring-[#004d49]/20 transition-all"
                />
              </div>

              <div>
                <label
                  htmlFor="ptSenha"
                  className="block text-xs font-semibold text-[#334155] mb-1.5"
                >
                  Senha *
                </label>
                <div className="relative">
                  <input
                    id="ptSenha"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    className="w-full h-11 px-3.5 pr-11 rounded-lg border border-[#cbd5e1] text-sm text-[#0f172a] placeholder-[#94a3b8] focus:outline-none focus:border-[#004d49] focus:ring-2 focus:ring-[#004d49]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar a senha" : "Mostrar a senha"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#64748b] hover:text-[#004d49] rounded-md transition-colors"
                  >
                    {showPassword ? (
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.5 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4-.9" />
                        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-2">
                  <a
                    href="https://app.laborrural.com/recuperar-senha"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#005854] hover:text-[#004d49] underline decoration-[#005854]/40 hover:decoration-[#004d49] transition-colors"
                  >
                    Esqueceu sua senha?
                  </a>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-[#fecaca] bg-[#feebe9] px-3.5 py-2.5 text-xs font-semibold text-[#991b1b]"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-5 rounded-lg bg-[#004d49] hover:bg-[#0f6e56] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "Entrando…" : "ENTRAR"}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-[#64748b]">
              Não tem uma conta?{" "}
              <a
                href="https://app.laborrural.com/cadastro"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#005854] hover:underline"
              >
                Cadastre-se
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer: Copyright */}
      <footer className="absolute bottom-6 right-6 md:right-10 z-20 text-sm sm:text-base text-white/90 font-medium tracking-wide">
        © Labor Rural | 2026
      </footer>
    </div>
  );
}
