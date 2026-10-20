"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={<div id="portao" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
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
    <div id="portao">
      <div className="pmarca">
        <div className="pm-ic">
          <img src="/img/logo-icone-branco.png" alt="Labor Rural" />
        </div>
        <h1 className="pm-tit">Elabore</h1>
        <p className="pm-sub">inteligência para o agronegócio</p>
      </div>

      <div className="pcx">
        <div className="plogo">
          <img src="/img/elabore_icone.svg" alt="Elabore" />
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--green-700)]">
              Labor Rural
            </span>
            <span className="text-sm font-bold text-[var(--ink-strong)]">
              Portal de Dados Elabore
            </span>
          </div>
        </div>

        <h2>Seja bem-vindo(a)!</h2>
        <p className="psub">
          Acesse sua conta com as credenciais do Elabore para consultar, filtrar e exportar dados.
        </p>

        {expired && !error && (
          <div
            role="status"
            className="mb-4 rounded-md border border-[#fde68a] bg-[#fff8e6] px-3 py-2 text-xs font-semibold text-[#8c5304]"
          >
            Sua sessão expirou. Faça login novamente para continuar.
          </div>
        )}

        <form onSubmit={onSubmit}>
          <label htmlFor="ptEmail">E-mail *</label>
          <input
            id="ptEmail"
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="seu.email@laborrural.com.br"
          />

          <label htmlFor="ptSenha">Senha *</label>
          <div className="psenha">
            <input
              id="ptSenha"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Digite sua senha"
            />
            <button
              type="button"
              className="pver"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar a senha" : "Mostrar a senha"}
              title={showPassword ? "Ocultar a senha" : "Mostrar a senha"}
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

          {error && (
            <div
              role="alert"
              className="mb-3 rounded-md border border-[#fecaca] bg-[#feebe9] px-3 py-2 text-xs font-semibold text-[#991b1b]"
            >
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-entrar">
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="mt-5 border-t border-[var(--line)] pt-3 text-center text-[11px] text-[var(--muted)]">
          Ambiente integrado à API oficial do Elabore · Somente leitura e exportação
        </div>
      </div>

      <div className="prod">© Labor Rural | 2026 · Departamento de Inteligência</div>
    </div>
  );
}
