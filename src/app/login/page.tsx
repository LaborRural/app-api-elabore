"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: f.get("email"), password: f.get("password") }),
    });
    setLoading(false);
    if (res.ok) {
      router.replace("/propriedades");
      router.refresh();
    } else {
      setError((await res.json().catch(() => null))?.error ?? "Falha no login");
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 space-y-4">
        <h1 className="text-xl font-semibold text-primary">Elabore</h1>
        <label className="block text-sm">
          E-mail
          <input name="email" type="email" required autoComplete="username"
            className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2" />
        </label>
        <label className="block text-sm">
          Senha
          <input name="password" type="password" required autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-line bg-bg px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={loading}
          className="w-full rounded-md bg-primary px-3 py-2 font-medium text-primary-fg disabled:opacity-60">
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
