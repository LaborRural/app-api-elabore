import { NextResponse } from "next/server";
import { apiBase } from "@/lib/api";
import { setSession } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const res = await fetch(`${apiBase()}${process.env.API_LOGIN_PATH ?? "/login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos. Verifique suas credenciais." },
        { status: 401 },
      );
    }
    await setSession(body.access_token);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível conectar ao servidor da API." },
      { status: 502 },
    );
  }
}
