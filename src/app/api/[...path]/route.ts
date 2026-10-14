import { NextResponse } from "next/server";
import { apiBase } from "@/lib/api";
import { getToken } from "@/lib/session";

// BFF somente leitura: repassa GET à API com o token do cookie.
export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const token = await getToken();
  if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { path } = await ctx.params;
  const { search } = new URL(req.url);
  const res = await fetch(`${apiBase()}/${path.join("/")}${search}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return new NextResponse(res.body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
